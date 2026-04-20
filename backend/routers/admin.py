import hashlib
import json
import os
import time

import asyncpg
from fastapi import APIRouter, Depends, Header, HTTPException

router = APIRouter()


async def verify_admin(x_admin_token: str = Header(None)) -> None:
    if not x_admin_token:
        raise HTTPException(status_code=401, detail="Token manquant")
    expected = os.environ.get("ADMIN_PASSWORD", "")
    valid = hashlib.sha256(f"{expected}{int(time.time() // 3600)}".encode()).hexdigest()
    prev  = hashlib.sha256(f"{expected}{int(time.time() // 3600) - 1}".encode()).hexdigest()
    if x_admin_token not in (valid, prev):
        raise HTTPException(status_code=401, detail="Token invalide ou expiré")


@router.post("/api/admin/auth")
async def admin_auth(body: dict):
    password = body.get("password", "")
    expected = os.environ.get("ADMIN_PASSWORD", "")
    if not expected:
        raise HTTPException(status_code=500, detail="ADMIN_PASSWORD non configuré")
    if password != expected:
        raise HTTPException(status_code=401, detail="Mot de passe incorrect")
    token = hashlib.sha256(f"{expected}{int(time.time() // 3600)}".encode()).hexdigest()
    return {"token": token, "valid_for": "1 heure"}


@router.get("/api/admin/verify")
async def admin_verify(token: str):
    expected = os.environ.get("ADMIN_PASSWORD", "")
    valid_token = hashlib.sha256(f"{expected}{int(time.time() // 3600)}".encode()).hexdigest()
    prev_token  = hashlib.sha256(f"{expected}{int(time.time() // 3600) - 1}".encode()).hexdigest()
    if token not in (valid_token, prev_token):
        raise HTTPException(status_code=401, detail="Token invalide ou expiré")
    return {"valid": True}


@router.get("/api/admin/sessions")
async def list_sessions(
    offset: int = 0,
    limit: int = 50,
    status: str = None,
    _: None = Depends(verify_admin),
):
    conn = await asyncpg.connect(os.environ["DATABASE_URL"])
    try:
        where = "WHERE 1=1"
        params: list = []
        if status:
            params.append(status)
            where += f" AND admin_status = ${len(params)}"

        params.extend([limit, offset])
        rows = await conn.fetch(f"""
            SELECT id, session_token, gender, divisions, times_input,
                   results_count, top_match, ip_address, created_at,
                   admin_label, admin_status, admin_notes
            FROM search_sessions
            {where}
            ORDER BY created_at DESC
            LIMIT ${len(params) - 1} OFFSET ${len(params)}
        """, *params)

        count_params = params[:-2] if len(params) > 2 else []
        total = await conn.fetchval(
            f"SELECT COUNT(*) FROM search_sessions {where}",
            *count_params,
        )

        result = []
        for r in rows:
            d = dict(r)
            if d.get("created_at"):
                d["created_at"] = d["created_at"].isoformat()
            result.append(d)
        return {"sessions": result, "total": total, "offset": offset, "limit": limit}
    finally:
        await conn.close()


@router.patch("/api/admin/sessions/{session_id}")
async def update_session(session_id: int, body: dict, _: None = Depends(verify_admin)):
    conn = await asyncpg.connect(os.environ["DATABASE_URL"])
    try:
        updates = []
        params  = []
        i = 1
        for field in ("admin_label", "admin_status", "admin_notes"):
            if field in body:
                updates.append(f"{field} = ${i}")
                params.append(body[field])
                i += 1
        if not updates:
            raise HTTPException(status_code=400, detail="Rien à mettre à jour")
        params.append(session_id)
        await conn.execute(
            f"UPDATE search_sessions SET {', '.join(updates)} WHERE id = ${i}",
            *params,
        )
        return {"ok": True}
    finally:
        await conn.close()


@router.get("/api/admin/sessions/{session_id}/detail")
async def get_session_detail(session_id: int, x_admin_token: str = Header(None)):
    await verify_admin(x_admin_token)
    conn = await asyncpg.connect(os.environ["DATABASE_URL"])
    try:
        row = await conn.fetchrow(
            "SELECT * FROM search_sessions WHERE id = $1", session_id
        )
        if not row:
            raise HTTPException(status_code=404, detail="Session non trouvée")
        d = dict(row)
        if d.get("created_at"):
            d["created_at"] = d["created_at"].isoformat()
        return {"session": d}
    finally:
        await conn.close()


@router.post("/api/admin/sessions/{session_id}/rematch")
async def rematch_session(session_id: int, x_admin_token: str = Header(None)):
    """Relance le matching avec les paramètres originaux de la session."""
    await verify_admin(x_admin_token)
    conn = await asyncpg.connect(os.environ["DATABASE_URL"])
    try:
        row = await conn.fetchrow(
            "SELECT * FROM search_sessions WHERE id = $1", session_id
        )
        if not row:
            raise HTTPException(status_code=404, detail="Session non trouvée")
        times_input = row["times_input"]
        if isinstance(times_input, str):
            times_input = json.loads(times_input)
        gender    = row["gender"] or "M"
        divisions = list(row["divisions"] or ["division_1", "division_2", "division_3", "division_4"])
    finally:
        await conn.close()

    from routers.match import compute_match
    return await compute_match({
        "times":     times_input,
        "gender":    gender,
        "divisions": divisions,
    })


@router.patch("/api/admin/sessions/{session_id}/notes")
async def update_notes(session_id: int, body: dict, x_admin_token: str = Header(None)):
    await verify_admin(x_admin_token)
    conn = await asyncpg.connect(os.environ["DATABASE_URL"])
    try:
        await conn.execute(
            "UPDATE search_sessions SET admin_notes = $1 WHERE id = $2",
            body.get("notes"), session_id,
        )
        return {"ok": True}
    finally:
        await conn.close()


@router.post("/api/admin/sessions/{session_id}/publish")
async def publish_matches(session_id: int, body: dict, x_admin_token: str = Header(None)):
    """Publie une sélection de matchs validés. body = { "matches": [...] }"""
    await verify_admin(x_admin_token)
    published = body.get("matches", [])
    conn = await asyncpg.connect(os.environ["DATABASE_URL"])
    try:
        await conn.execute(
            """UPDATE search_sessions
               SET published_matches = $1::jsonb, admin_status = 'accompagné'
               WHERE id = $2""",
            json.dumps(published), session_id,
        )
        return {"success": True, "published_count": len(published)}
    finally:
        await conn.close()


@router.get("/api/sessions/{session_token}/results")
async def get_published_results(session_token: str):
    """Endpoint PUBLIC — l'athlète consulte ses matchs validés via son token."""
    conn = await asyncpg.connect(os.environ["DATABASE_URL"])
    try:
        row = await conn.fetchrow(
            "SELECT * FROM search_sessions WHERE session_token = $1", session_token
        )
        if not row:
            raise HTTPException(status_code=404, detail="Session non trouvée")
        d = dict(row)
        return {
            "session_id":        d["id"],
            "label":             d["admin_label"] or f"Session #{d['id']}",
            "status":            d["admin_status"],
            "published_matches": d["published_matches"],
            "is_published":      d["published_matches"] is not None,
            "created_at":        d["created_at"].isoformat() if d.get("created_at") else None,
        }
    finally:
        await conn.close()


@router.get("/api/admin/users")
async def list_users(x_admin_token: str = Header(None)):
    await verify_admin(x_admin_token)
    conn = await asyncpg.connect(os.environ["DATABASE_URL"])
    try:
        users = await conn.fetch("""
            SELECT id, email, first_name, last_name, is_active, plan,
                   created_at,
                   array_length(session_tokens, 1) as sessions_count
            FROM users
            ORDER BY created_at DESC
        """)
        result = []
        for u in users:
            d = dict(u)
            if d.get("created_at"):
                d["created_at"] = d["created_at"].isoformat()
            result.append(d)
        return {"users": result}
    finally:
        await conn.close()


@router.patch("/api/admin/users/{user_id}/activate")
async def activate_user(user_id: int, body: dict, x_admin_token: str = Header(None)):
    await verify_admin(x_admin_token)
    conn = await asyncpg.connect(os.environ["DATABASE_URL"])
    try:
        await conn.execute(
            "UPDATE users SET is_active = $1, plan = $2 WHERE id = $3",
            body.get("is_active", True), body.get("plan", "match"), user_id,
        )
        return {"success": True}
    finally:
        await conn.close()


@router.get("/api/admin/users/{user_id}/sessions")
async def get_user_sessions(user_id: int, x_admin_token: str = Header(None)):
    await verify_admin(x_admin_token)
    conn = await asyncpg.connect(os.environ["DATABASE_URL"])
    try:
        user = await conn.fetchrow("SELECT session_tokens FROM users WHERE id = $1", user_id)
        if not user or not user["session_tokens"]:
            return {"sessions": []}
        sessions = await conn.fetch("""
            SELECT id, session_token, gender, times_input, results_count,
                   top_match, created_at, admin_status, published_matches,
                   admin_notes, admin_label
            FROM search_sessions
            WHERE session_token = ANY($1)
            ORDER BY created_at DESC
        """, user["session_tokens"])
        result = []
        for s in sessions:
            d = dict(s)
            if d.get("created_at"):
                d["created_at"] = d["created_at"].isoformat()
            result.append(d)
        return {"sessions": result}
    finally:
        await conn.close()


@router.get("/api/admin/stats")
async def get_stats(x_admin_token: str = Header(None)):
    await verify_admin(x_admin_token)
    conn = await asyncpg.connect(os.environ["DATABASE_URL"])
    try:
        weekly = await conn.fetch("""
            SELECT DATE_TRUNC('week', created_at) as week, COUNT(*) as searches
            FROM search_sessions
            WHERE created_at > NOW() - INTERVAL '8 weeks'
            GROUP BY week ORDER BY week ASC
        """)
        div_rows = await conn.fetch("""
            SELECT unnest(divisions) as division, COUNT(*) as count
            FROM search_sessions
            GROUP BY division ORDER BY count DESC
        """)
        state_rows = await conn.fetch("""
            SELECT admin_status, COUNT(*) as count
            FROM search_sessions
            GROUP BY admin_status ORDER BY count DESC
        """)
        total_sessions   = await conn.fetchval("SELECT COUNT(*) FROM search_sessions")
        total_registered = await conn.fetchval("SELECT COUNT(*) FROM users")
        total_active     = await conn.fetchval("SELECT COUNT(*) FROM users WHERE is_active = true")
        total_signed     = await conn.fetchval("SELECT COUNT(*) FROM search_sessions WHERE admin_status = 'signé'")
        total_published  = await conn.fetchval("SELECT COUNT(*) FROM search_sessions WHERE published_matches IS NOT NULL")
        gender_rows = await conn.fetch("""
            SELECT gender, COUNT(*) as count
            FROM search_sessions WHERE gender IS NOT NULL
            GROUP BY gender
        """)
        weekly_users = await conn.fetch("""
            SELECT DATE_TRUNC('week', created_at) as week, COUNT(*) as signups
            FROM users
            WHERE created_at > NOW() - INTERVAL '8 weeks'
            GROUP BY week ORDER BY week ASC
        """)
        top_schools = await conn.fetch("""
            SELECT top_match, COUNT(*) as count
            FROM search_sessions WHERE top_match IS NOT NULL
            GROUP BY top_match ORDER BY count DESC LIMIT 10
        """)

        def fmt(dt):
            return dt.strftime('%d/%m') if dt else None

        return {
            "overview": {
                "total_sessions":   total_sessions,
                "total_registered": total_registered,
                "total_active":     total_active,
                "total_signed":     total_signed,
                "total_published":  total_published,
                "conversion_rate":  round(total_registered / total_sessions * 100, 1) if total_sessions else 0,
                "activation_rate":  round(total_active / total_registered * 100, 1) if total_registered else 0,
            },
            "weekly_searches": [{"week": fmt(r["week"]), "searches": r["searches"]} for r in weekly],
            "weekly_signups":  [{"week": fmt(r["week"]), "signups":  r["signups"]}  for r in weekly_users],
            "divisions":   [{"division": r["division"], "count": r["count"]} for r in div_rows],
            "statuses":    [{"status": r["admin_status"] or "non défini", "count": r["count"]} for r in state_rows],
            "genders":     [{"gender": r["gender"], "count": r["count"]} for r in gender_rows],
            "top_schools": [{"school": r["top_match"], "count": r["count"]} for r in top_schools],
        }
    finally:
        await conn.close()


@router.patch("/api/admin/users/{user_id}")
async def update_user(user_id: int, body: dict, x_admin_token: str = Header(None)):
    """Met à jour plan, is_active, ou lie une session supplémentaire."""
    await verify_admin(x_admin_token)
    conn = await asyncpg.connect(os.environ["DATABASE_URL"])
    try:
        if "add_session_token" in body:
            session_token = body["add_session_token"]
            await conn.execute("""
                UPDATE users
                SET session_tokens = array_append(session_tokens, $1)
                WHERE id = $2 AND NOT ($1 = ANY(session_tokens))
            """, session_token, user_id)

        updates = []
        params = []
        i = 1
        for field in ("plan", "is_active"):
            if field in body:
                updates.append(f"{field} = ${i}")
                params.append(body[field])
                i += 1
        if updates:
            params.append(user_id)
            await conn.execute(
                f"UPDATE users SET {', '.join(updates)} WHERE id = ${i}",
                *params,
            )
        return {"success": True}
    finally:
        await conn.close()
