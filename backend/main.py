from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from routers.match import router as match_router
from routers.admin import router as admin_router
from routers.auth import router as auth_router
from routers.messages import router as messages_router
from routers.documents import router as documents_router
from routers.checklist import router as checklist_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://rise-match-gtqb.vercel.app",
        "http://localhost:3000",
        "http://localhost:3001",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(match_router)
app.include_router(admin_router)
app.include_router(auth_router)
app.include_router(messages_router)
app.include_router(documents_router)
app.include_router(checklist_router)


@app.on_event("startup")
async def create_tables():
    import asyncpg, os
    conn = await asyncpg.connect(os.environ["DATABASE_URL"])
    # users doit être créé en premier — search_sessions le référence via user_id
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id             SERIAL PRIMARY KEY,
            email          TEXT UNIQUE NOT NULL,
            password_hash  TEXT NOT NULL,
            first_name     TEXT,
            last_name      TEXT,
            created_at     TIMESTAMP DEFAULT NOW(),
            is_active      BOOLEAN DEFAULT FALSE,
            plan           TEXT DEFAULT 'free',
            session_tokens TEXT[] DEFAULT '{}'
        )
    """)
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS search_sessions (
            id               SERIAL PRIMARY KEY,
            session_token    TEXT UNIQUE,
            gender           TEXT,
            divisions        TEXT[],
            times_input      JSONB,
            results_count    INTEGER,
            top_match        TEXT,
            ip_address       TEXT,
            created_at       TIMESTAMP DEFAULT NOW(),
            admin_label      TEXT,
            admin_status     TEXT DEFAULT 'nouveau',
            admin_notes      TEXT,
            published_matches JSONB,
            user_id          INTEGER REFERENCES users(id) ON DELETE SET NULL
        )
    """)
    await conn.execute("""
        ALTER TABLE search_sessions
        ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
    """)
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS documents (
            id           SERIAL PRIMARY KEY,
            user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            uploaded_by  TEXT NOT NULL,
            file_name    TEXT NOT NULL,
            file_url     TEXT NOT NULL,
            file_type    TEXT,
            file_size    INTEGER,
            label        TEXT,
            created_at   TIMESTAMP DEFAULT NOW()
        )
    """)
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id          SERIAL PRIMARY KEY,
            user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            sender      TEXT NOT NULL,
            sender_name TEXT,
            content     TEXT NOT NULL,
            is_read     BOOLEAN DEFAULT FALSE,
            created_at  TIMESTAMP DEFAULT NOW(),
            session_id  INTEGER REFERENCES search_sessions(id) ON DELETE SET NULL
        )
    """)
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS checklists (
            id         SERIAL PRIMARY KEY,
            user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            steps      JSONB NOT NULL DEFAULT '[]',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
    """)
    await conn.close()


@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/api/debug/db")
async def debug_db(x_admin_token: str = Header(None)):
    import asyncpg, os, hashlib, time as t
    expected = os.environ.get("ADMIN_PASSWORD", "")
    valid = hashlib.sha256(f"{expected}{int(t.time() // 3600)}".encode()).hexdigest()
    prev  = hashlib.sha256(f"{expected}{int(t.time() // 3600) - 1}".encode()).hexdigest()
    if x_admin_token not in (valid, prev):
        raise HTTPException(status_code=401, detail="Non autorisé")
    try:
        conn = await asyncpg.connect(os.environ["DATABASE_URL"])
        teams = await conn.fetchval("SELECT COUNT(*) FROM sc_teams")
        swimmers = await conn.fetchval("SELECT COUNT(*) FROM sc_swimmers")
        times = await conn.fetchval("SELECT COUNT(*) FROM sc_times")
        last = await conn.fetchval("SELECT MAX(updated_at) FROM data_freshness")
        await conn.close()
        return {
            "sc_teams": teams,
            "sc_swimmers": swimmers,
            "sc_times": times,
            "last_worker_run": str(last)
        }
    except Exception as e:
        return {"error": str(e)}
