from fastapi import APIRouter, HTTPException, Header
import asyncpg, os
from routers.auth import verify_token
from routers.admin import verify_admin

router = APIRouter()


# ── ENDPOINTS ATHLÈTE ────────────────────────────────────────────────────────

@router.get("/api/messages/unread-count")
async def get_unread_count(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        return {"count": 0}
    payload = verify_token(authorization.replace("Bearer ", ""))
    if not payload:
        return {"count": 0}

    conn = await asyncpg.connect(os.environ["DATABASE_URL"])
    try:
        count = await conn.fetchval("""
            SELECT COUNT(*) FROM messages
            WHERE user_id = $1 AND sender = 'admin' AND is_read = false
        """, payload["user_id"])
        return {"count": int(count)}
    finally:
        await conn.close()


@router.get("/api/messages")
async def get_my_messages(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token manquant")
    payload = verify_token(authorization.replace("Bearer ", ""))
    if not payload:
        raise HTTPException(status_code=401, detail="Token invalide")

    conn = await asyncpg.connect(os.environ["DATABASE_URL"])
    try:
        rows = await conn.fetch("""
            SELECT id, sender, sender_name, content, is_read,
                   created_at, session_id
            FROM messages
            WHERE user_id = $1
            ORDER BY created_at ASC
        """, payload["user_id"])

        await conn.execute("""
            UPDATE messages SET is_read = true
            WHERE user_id = $1 AND sender = 'admin' AND is_read = false
        """, payload["user_id"])

        result = []
        for r in rows:
            d = dict(r)
            d["created_at"] = d["created_at"].isoformat()
            result.append(d)
        return {"messages": result}
    finally:
        await conn.close()


@router.post("/api/messages")
async def send_athlete_message(body: dict, authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token manquant")
    payload = verify_token(authorization.replace("Bearer ", ""))
    if not payload:
        raise HTTPException(status_code=401, detail="Token invalide")

    content = body.get("content", "").strip()
    if not content:
        raise HTTPException(status_code=400, detail="Message vide")
    if len(content) > 2000:
        raise HTTPException(status_code=400, detail="Message trop long (2000 chars max)")

    conn = await asyncpg.connect(os.environ["DATABASE_URL"])
    try:
        user = await conn.fetchrow(
            "SELECT first_name, last_name FROM users WHERE id = $1",
            payload["user_id"]
        )
        sender_name = f"{user['first_name'] or ''} {user['last_name'] or ''}".strip() or "Athlète"

        msg_id = await conn.fetchval("""
            INSERT INTO messages (user_id, sender, sender_name, content, session_id)
            VALUES ($1, 'athlete', $2, $3, $4)
            RETURNING id
        """, payload["user_id"], sender_name, content, body.get("session_id"))

        return {"id": msg_id, "success": True}
    finally:
        await conn.close()


# ── ENDPOINTS ADMIN ──────────────────────────────────────────────────────────

@router.get("/api/admin/messages/unread")
async def get_admin_unread(x_admin_token: str = Header(None)):
    await verify_admin(x_admin_token)
    conn = await asyncpg.connect(os.environ["DATABASE_URL"])
    try:
        rows = await conn.fetch("""
            SELECT m.user_id, u.first_name, u.last_name, u.email,
                   COUNT(*) as unread_count,
                   MAX(m.created_at) as last_message
            FROM messages m
            JOIN users u ON u.id = m.user_id
            WHERE m.sender = 'athlete' AND m.is_read = false
            GROUP BY m.user_id, u.first_name, u.last_name, u.email
            ORDER BY last_message DESC
        """)
        result = []
        for r in rows:
            d = dict(r)
            d["last_message"] = d["last_message"].isoformat()
            d["unread_count"] = int(d["unread_count"])
            result.append(d)
        return {"unread": result, "total": sum(r["unread_count"] for r in result)}
    finally:
        await conn.close()


@router.get("/api/admin/messages/{user_id}")
async def get_user_messages(user_id: int, x_admin_token: str = Header(None)):
    await verify_admin(x_admin_token)
    conn = await asyncpg.connect(os.environ["DATABASE_URL"])
    try:
        rows = await conn.fetch("""
            SELECT id, sender, sender_name, content, is_read,
                   created_at, session_id
            FROM messages
            WHERE user_id = $1
            ORDER BY created_at ASC
        """, user_id)

        await conn.execute("""
            UPDATE messages SET is_read = true
            WHERE user_id = $1 AND sender = 'athlete' AND is_read = false
        """, user_id)

        result = []
        for r in rows:
            d = dict(r)
            d["created_at"] = d["created_at"].isoformat()
            result.append(d)
        return {"messages": result}
    finally:
        await conn.close()


@router.post("/api/admin/messages/{user_id}")
async def send_admin_message(user_id: int, body: dict, x_admin_token: str = Header(None)):
    await verify_admin(x_admin_token)
    content = body.get("content", "").strip()
    if not content:
        raise HTTPException(status_code=400, detail="Message vide")
    if len(content) > 2000:
        raise HTTPException(status_code=400, detail="Message trop long (2000 chars max)")

    conn = await asyncpg.connect(os.environ["DATABASE_URL"])
    try:
        user_exists = await conn.fetchval("SELECT id FROM users WHERE id = $1", user_id)
        if not user_exists:
            raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

        msg_id = await conn.fetchval("""
            INSERT INTO messages (user_id, sender, sender_name, content, session_id)
            VALUES ($1, 'admin', 'Équipe RISE', $2, $3)
            RETURNING id
        """, user_id, content, body.get("session_id"))
        return {"id": msg_id, "success": True}
    finally:
        await conn.close()
