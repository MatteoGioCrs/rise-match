import hashlib
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
async def list_sessions(_: None = Depends(verify_admin)):
    conn = await asyncpg.connect(os.environ["DATABASE_URL"])
    try:
        rows = await conn.fetch("""
            SELECT id, session_token, gender, divisions, times_input,
                   results_count, top_match, ip_address, created_at,
                   admin_label, admin_status, admin_notes
            FROM search_sessions
            ORDER BY created_at DESC LIMIT 50
        """)
        result = []
        for r in rows:
            d = dict(r)
            if d.get("created_at"):
                d["created_at"] = d["created_at"].isoformat()
            result.append(d)
        return result
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
