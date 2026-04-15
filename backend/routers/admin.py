import hashlib
import os
import time

from fastapi import APIRouter, HTTPException

router = APIRouter()


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
