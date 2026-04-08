from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from database import init_db, close_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    await close_db()

app = FastAPI(title="RISE.MATCH API", version="0.2.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.2.0"}

@app.get("/api/debug/db")
async def debug_db():
    """Vérifie que les tables SwimCloud sont remplies."""
    import asyncpg, os
    conn = await asyncpg.connect(os.environ["DATABASE_URL"])
    teams = await conn.fetchval("SELECT COUNT(*) FROM sc_teams")
    swimmers = await conn.fetchval("SELECT COUNT(*) FROM sc_swimmers")
    times = await conn.fetchval("SELECT COUNT(*) FROM sc_times")
    freshness = await conn.fetchrow("SELECT * FROM data_freshness WHERE source='swimcloud'")
    await conn.close()
    return {
        "sc_teams": teams,
        "sc_swimmers": swimmers,
        "sc_times": times,
        "last_worker_run": str(freshness["last_updated"]) if freshness else "jamais",
    }

@app.post("/api/match")
async def compute_match(body: dict):
    """
    Input : times LCM/SCM saisis manuellement par le nageur.
    Output : liste d'universités matchées avec scores.
    À implémenter après validation du worker.
    """
    return {"status": "not_implemented_yet", "received": body}
