from fastapi import APIRouter, HTTPException, Header
import asyncpg, os
from routers.auth import verify_token
from routers.admin import verify_admin

router = APIRouter()

ALLOWED_FIELDS = [
    "birth_year", "departure_year", "current_level",
    "english_level", "toefl_score", "club_name",
    "coach_name", "coach_email", "objective",
    "budget_range", "notes_perso",
]


@router.get("/api/profile")
async def get_profile(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token manquant")
    payload = verify_token(authorization.replace("Bearer ", ""))
    if not payload:
        raise HTTPException(status_code=401, detail="Token invalide")

    conn = await asyncpg.connect(os.environ["DATABASE_URL"])
    try:
        row = await conn.fetchrow(
            "SELECT * FROM athlete_profiles WHERE user_id = $1", payload["user_id"]
        )
        return dict(row) if row else {"user_id": payload["user_id"]}
    finally:
        await conn.close()


@router.put("/api/profile")
async def update_profile(body: dict, authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token manquant")
    payload = verify_token(authorization.replace("Bearer ", ""))
    if not payload:
        raise HTTPException(status_code=401, detail="Token invalide")

    fields = {k: v for k, v in body.items() if k in ALLOWED_FIELDS}
    if not fields:
        raise HTTPException(status_code=400, detail="Aucun champ valide")

    conn = await asyncpg.connect(os.environ["DATABASE_URL"])
    try:
        sets = ", ".join(f"{k} = ${i+2}" for i, k in enumerate(fields))
        values = list(fields.values())
        await conn.execute(f"""
            INSERT INTO athlete_profiles (user_id, {", ".join(fields)})
            VALUES ($1, {", ".join(f"${i+2}" for i in range(len(fields)))})
            ON CONFLICT (user_id) DO UPDATE
            SET {sets}, updated_at = NOW()
        """, payload["user_id"], *values)
        return {"success": True}
    finally:
        await conn.close()


@router.get("/api/admin/profile/{user_id}")
async def admin_get_profile(user_id: int, x_admin_token: str = Header(None)):
    await verify_admin(x_admin_token)
    conn = await asyncpg.connect(os.environ["DATABASE_URL"])
    try:
        row = await conn.fetchrow(
            "SELECT * FROM athlete_profiles WHERE user_id = $1", user_id
        )
        return dict(row) if row else {"user_id": user_id}
    finally:
        await conn.close()


@router.patch("/api/admin/profile/{user_id}")
async def admin_update_profile(
    user_id: int, body: dict, x_admin_token: str = Header(None)
):
    await verify_admin(x_admin_token)
    fields = {k: v for k, v in body.items() if k in ALLOWED_FIELDS}
    if not fields:
        raise HTTPException(status_code=400, detail="Aucun champ valide")

    conn = await asyncpg.connect(os.environ["DATABASE_URL"])
    try:
        sets = ", ".join(f"{k} = ${i+2}" for i, k in enumerate(fields))
        values = list(fields.values())
        await conn.execute(f"""
            INSERT INTO athlete_profiles (user_id, {", ".join(fields)})
            VALUES ($1, {", ".join(f"${i+2}" for i in range(len(fields)))})
            ON CONFLICT (user_id) DO UPDATE
            SET {sets}, updated_at = NOW()
        """, user_id, *values)
        return {"success": True}
    finally:
        await conn.close()
