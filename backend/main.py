"""RISE.MATCH — FastAPI backend entry point."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from config import settings
from database import init_db, close_db
from routers import swimmers, universities, matches, emails, auth, demo, debug


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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(swimmers.router)
app.include_router(universities.router)
app.include_router(matches.router)
app.include_router(emails.router)
app.include_router(demo.router)
app.include_router(debug.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "rise-match-api"}


@app.get("/admin/debug-swimcloud/{team_id}")
async def debug_swimcloud(team_id: int):
    """
    Diagnostic endpoint — validates curl_cffi bypass and HTML parsing for a given team.
    Call after deploy: /admin/debug-swimcloud/122 (Drury University)
    """
    from scrapers.swimcloud_scraper import _get_page, fetch_roster, fetch_team_best_times
    from bs4 import BeautifulSoup

    results = {}

    # Test 1: raw fetch — can we get past Cloudflare?
    roster_url = (
        f"https://www.swimcloud.com/team/{team_id}/roster/"
        f"?page=1&gender=M&season_id=29&sort=name"
    )
    try:
        html = await _get_page(roster_url)
        soup = BeautifulSoup(html, "html.parser")
        results["raw_fetch"] = {
            "html_length": len(html),
            "status": "success" if len(html) > 5000 else "likely_blocked",
            "has_cloudflare": "cloudflare" in html.lower() or "cf-ray" in html.lower(),
            "html_preview": html[:800],
            "all_classes_found": list({
                el.get("class", [""])[0]
                for el in soup.find_all(class_=True)
            })[:30],
        }
    except Exception as e:
        results["raw_fetch"] = {"status": "failed", "error": str(e)}

    # Test 2: parsed roster
    try:
        roster = await fetch_roster(team_id, "M")
        results["roster"] = {
            "count": len(roster),
            "departing": [a for a in roster if a.get("is_departing")],
            "sample": roster[:5],
        }
    except Exception as e:
        results["roster"] = {"status": "failed", "error": str(e)}

    # Test 3: best times for 100BR
    try:
        times = await fetch_team_best_times(team_id, "100BR", "M")
        results["times_100BR"] = {"count": len(times), "top3": times[:3]}
    except Exception as e:
        results["times_100BR"] = {"status": "failed", "error": str(e)}

    return results


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