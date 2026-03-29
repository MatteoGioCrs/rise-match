"""RISE.MATCH — FastAPI backend entry point."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import init_db, close_db
from routers import swimmers, universities, matches, emails


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    await close_db()


app = FastAPI(
    title="RISE.MATCH API",
    description="Data-driven recruitment matching for French swimmers targeting US/Canadian universities.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(swimmers.router)
app.include_router(universities.router)
app.include_router(matches.router)
app.include_router(emails.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "rise-match-api"}
