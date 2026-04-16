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
    email = body.get("email")
    password = body.get("password")
    first_name = body.get("first_name")
    last_name = body.get("last_name")
    session_token = body.get("session_token")

    # 1. HACHER LE MOT DE PASSE AVANT INSERTION
    hashed_password = hash_password(password)

    conn = await asyncpg.connect(os.environ["DATABASE_URL"])
    try:
        existing = await conn.fetchval("SELECT id FROM users WHERE email = $1", email)
        if existing:
            raise HTTPException(status_code=400, detail="Email déjà utilisé")
        
        # On insère hashed_password, pas password
        user_id = await conn.fetchval(
            """INSERT INTO users (email, password_hash, first_name, last_name, is_active) 
               VALUES ($1, $2, $3, $4, true) RETURNING id""",
            email, hashed_password, first_name, last_name
        )

        if session_token:
            await conn.execute(
                "UPDATE search_sessions SET user_id = $1 WHERE session_token = $2",
                user_id, session_token
            )
            # Récupérer l'ID de session pour le lier au user
            session_id = await conn.fetchval("SELECT id FROM search_sessions WHERE session_token = $1", session_token)
            if session_id:
                # Ajouter l'ID à l'array session_tokens de l'utilisateur
                await conn.execute(
                    "UPDATE users SET session_tokens = array_append(session_tokens, $1) WHERE id = $2",
                    session_token, user_id
                )

        # Générer le vrai token
        token = make_token(user_id, email)
        return {"access_token": token, "user": {"id": user_id, "email": email, "is_active": True}}
    finally:
        await conn.close()


@router.post("/api/auth/login")
async def login(body: dict):
    email = body.get("email")
    password = body.get("password")
    
    # 2. HACHER LE MOT DE PASSE AVANT DE COMPARER AVEC LA BDD
    hashed_password = hash_password(password)
    
    conn = await asyncpg.connect(os.environ["DATABASE_URL"])
    try:
        # On compare avec hashed_password
        user = await conn.fetchrow("SELECT * FROM users WHERE email = $1 AND password_hash = $2", email, hashed_password)
        
        if not user:
            raise HTTPException(status_code=401, detail="Identifiants incorrects")
        
        # Générer le vrai token
        token = make_token(user["id"], user["email"])
        return {"access_token": token, "user": dict(user)}
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
