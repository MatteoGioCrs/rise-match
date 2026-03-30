"""RISE.MATCH — FastAPI backend entry point."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from config import settings
from database import init_db, close_db
from routers import swimmers, universities, matches, emails, auth


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

from fastapi.middleware.cors import CORSMiddleware
import os

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://rise-match-gtqb.vercel.app", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(swimmers.router)
app.include_router(universities.router)
app.include_router(matches.router)
app.include_router(emails.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "rise-match-api"}


@app.get("/admin/migrate")
async def migrate():
    from database import engine
    from sqlalchemy import text
    async with engine.begin() as conn:
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT"))
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free'"))
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer TEXT"))
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS rgpd_consent BOOLEAN DEFAULT FALSE"))
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS parent_consent BOOLEAN DEFAULT FALSE"))
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_minor BOOLEAN DEFAULT FALSE"))
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ"))
    return {"status": "migration done"}

@app.delete("/admin/clean-user/{email}")
async def clean_user(email: str):
    from database import get_db
    from sqlalchemy import text
    async for db in get_db():
        await db.execute(text(f"DELETE FROM swimmer_profiles WHERE user_id = (SELECT id FROM users WHERE email = '{email}')"))
        await db.execute(text(f"DELETE FROM users WHERE email = '{email}'"))
        await db.commit()
    return {"status": "deleted"}