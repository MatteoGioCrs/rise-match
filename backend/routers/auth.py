from fastapi import APIRouter, HTTPException, Header
import asyncpg, os, hashlib, hmac, base64, time

router = APIRouter()

def hash_password(password: str) -> str:
    salt = "RISE_MATCH_2026"
    return hashlib.sha256(f"{salt}{password}".encode()).hexdigest()

def make_token(user_id: int, email: str) -> str:
    secret = os.environ.get("ADMIN_PASSWORD", "default")
    payload = f"{user_id}:{email}:{int(time.time() // 86400)}"
    sig = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()[:16]
    encoded = base64.b64encode(payload.encode()).decode()
    return f"{encoded}.{sig}"

def verify_token(token: str) -> dict | None:
    try:
        encoded, sig = token.split(".")
        payload = base64.b64decode(encoded).decode()
        parts = payload.split(":")
        user_id, email = parts[0], parts[1]
        secret = os.environ.get("ADMIN_PASSWORD", "default")
        for offset in [0, -1]:
            day = int(time.time() // 86400) + offset
            expected_payload = f"{user_id}:{email}:{day}"
            expected_sig = hmac.new(
                secret.encode(), expected_payload.encode(), hashlib.sha256
            ).hexdigest()[:16]
            if sig == expected_sig:
                return {"user_id": int(user_id), "email": email}
        return None
    except:
        return None

@router.post("/api/auth/register")
async def register(body: dict):
    email = body.get("email", "").lower().strip()
    password = body.get("password", "")
    first_name = body.get("first_name", "")
    last_name = body.get("last_name", "")
    session_token = body.get("session_token")

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email et mot de passe requis")
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Mot de passe trop court (8 caractères min)")

    conn = await asyncpg.connect(os.environ["DATABASE_URL"])
    try:
        existing = await conn.fetchval("SELECT id FROM users WHERE email = $1", email)
        if existing:
            raise HTTPException(status_code=409, detail="Email déjà utilisé")

        user_id = await conn.fetchval("""
            INSERT INTO users (email, password_hash, first_name, last_name, session_tokens)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
        """, email, hash_password(password), first_name, last_name,
            [session_token] if session_token else [])

        if session_token:
            label = f"{first_name} {last_name}".strip() or email
            await conn.execute("""
                UPDATE search_sessions
                SET admin_label = $1
                WHERE session_token = $2 AND admin_label IS NULL
            """, label, session_token)

        return {
            "user_id": user_id,
            "email": email,
            "first_name": first_name,
            "last_name": last_name,
            "is_active": False,
            "token": make_token(user_id, email)
        }
    finally:
        await conn.close()

@router.post("/api/auth/login")
async def login(body: dict):
    email = body.get("email", "").lower().strip()
    password = body.get("password", "")

    conn = await asyncpg.connect(os.environ["DATABASE_URL"])
    try:
        user = await conn.fetchrow("SELECT * FROM users WHERE email = $1", email)
        if not user or user["password_hash"] != hash_password(password):
            raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

        return {
            "user_id": user["id"],
            "email": user["email"],
            "first_name": user["first_name"],
            "last_name": user["last_name"],
            "is_active": user["is_active"],
            "plan": user["plan"],
            "token": make_token(user["id"], email)
        }
    finally:
        await conn.close()

@router.get("/api/auth/me")
async def get_me(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token manquant")
    payload = verify_token(authorization.replace("Bearer ", ""))
    if not payload:
        raise HTTPException(status_code=401, detail="Token invalide")

    conn = await asyncpg.connect(os.environ["DATABASE_URL"])
    try:
        user = await conn.fetchrow("""
            SELECT id, email, first_name, last_name, is_active, plan,
                   session_tokens, created_at
            FROM users WHERE id = $1
        """, payload["user_id"])
        if not user:
            raise HTTPException(status_code=404, detail="Compte introuvable")
        return dict(user)
    finally:
        await conn.close()

@router.get("/api/auth/my-matches")
async def get_my_matches(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token manquant")
    payload = verify_token(authorization.replace("Bearer ", ""))
    if not payload:
        raise HTTPException(status_code=401, detail="Token invalide")

    conn = await asyncpg.connect(os.environ["DATABASE_URL"])
    try:
        user = await conn.fetchrow("SELECT * FROM users WHERE id = $1", payload["user_id"])
        if not user:
            raise HTTPException(status_code=404, detail="Compte introuvable")
        if not user["is_active"]:
            return {"is_active": False, "sessions": []}

        sessions = await conn.fetch("""
            SELECT id, session_token, created_at, admin_status,
                   times_input, results_count, top_match,
                   published_matches, admin_notes
            FROM search_sessions
            WHERE session_token = ANY($1)
            ORDER BY created_at DESC
        """, user["session_tokens"] or [])

        return {
            "is_active": True,
            "plan": user["plan"],
            "sessions": [dict(s) for s in sessions]
        }
    finally:
        await conn.close()
