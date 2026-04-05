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


app = FastAPI(title="RISE.MATCH API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/api/ffn/debug/{licence}")
async def debug_ffn(licence: str):
    import httpx
    from bs4 import BeautifulSoup

    url = f"https://ffn.extranat.fr/webffn/nat_recherche.php?idact=nat&idrch_id={licence}&idbas=50"
    async with httpx.AsyncClient(timeout=15, headers={
        "User-Agent": "Mozilla/5.0",
        "Accept-Language": "fr-FR,fr;q=0.9",
    }) as client:
        r = await client.get(url)
        html = r.content.decode("utf-8", errors="replace")

    soup = BeautifulSoup(html, "html.parser")
    all_tables = soup.find_all("table")
    return {
        "total_tables": len(all_tables),
        "table_classes": [" ".join(t.get("class", [])) for t in all_tables],
        "table_headers": [
            t.find("thead").get_text(strip=True)[:200] if t.find("thead") else "no thead"
            for t in all_tables
        ],
        "html_slice_5000_6000": html[5000:6000],
    }


@app.get("/api/ffn/{licence}")
async def get_ffn(licence: str):
    from scrapers.ffn import fetch_perfs
    return await fetch_perfs(licence)
