from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import asyncpg
import os
from routers.match import router as match_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield

app = FastAPI(title="RISE.MATCH API", version="0.2.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(match_router)

@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.2.0"}

@app.get("/api/debug/db")
async def debug_db():
    try:
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
    except Exception as e:
        return {"error": str(e)}
