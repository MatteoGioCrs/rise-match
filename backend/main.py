from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.match import router as match_router
from routers.admin import router as admin_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(match_router)
app.include_router(admin_router)


@app.on_event("startup")
async def create_tables():
    import asyncpg, os
    conn = await asyncpg.connect(os.environ["DATABASE_URL"])
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
            published_matches JSONB
        )
    """)
    await conn.close()


@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/api/debug/db")
async def debug_db():
    import asyncpg, os
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
