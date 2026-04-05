"""
Debug endpoints — for validation only, not production features.
These expose raw scraping and API results to verify data pipelines are working.
"""

from fastapi import APIRouter, Query

router = APIRouter(prefix="/api/debug", tags=["debug"])


@router.get("/swimmer")
async def debug_swimmer(
    name: str = Query(..., description="Nom du nageur (ex: Manaudou)"),
    event: str = Query("100BR", description="Code épreuve (ex: 100BR, 50FR)"),
    basin: str = Query("LCM", description="Bassin: LCM ou SCM"),
    country: str = Query("FRA", description="Code pays (ISO 3166 3 lettres)"),
):
    """
    Fetch swimmer times from World Aquatics API.
    - name non vide → search_swimmer_times (all events filtered by name)
    - name vide ou event seul → fetch_french_times (top list for that event)
    """
    from scrapers.world_aquatics import search_swimmer_times, fetch_french_times

    if name:
        result = await search_swimmer_times(name, country_id=country, events=[event])
        return result

    results = await fetch_french_times(event, basin, "M", country)
    return {"event": event, "basin": basin, "country": country, "count": len(results), "results": results}


@router.get("/ffn")
async def debug_ffn(
    licence: str = Query(..., description="Numéro de licence FFN (ex: 2584377)"),
    basin: str = Query("LCM", description="Bassin: LCM (50m) ou SCM (25m)"),
):
    """
    Fetch raw performances for a FFN licence from Extranat.
    Validates post-cyberattack URL format (idrch_id + idbas).
    Returns html_preview if no performances parsed (for debugging).
    """
    from scrapers.ffn_scraper import fetch_swimmer_perfs
    import httpx
    from scrapers.ffn_scraper import BASE_URL, HEADERS

    # Also return raw html snippet for diagnosing selector issues
    url = BASE_URL + "nat_recherche.php"
    idbas = "25" if basin == "SCM" else "50"
    params = {"idact": "nat", "idrch_id": licence, "idbas": idbas}

    html_preview = None
    html_length = 0
    try:
        async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True, timeout=30) as client:
            resp = await client.get(url, params=params)
            resp.encoding = "iso-8859-1"
            raw_html = resp.text
            html_length = len(raw_html)
            html_preview = raw_html[:1000]
    except Exception as e:
        return {"licence": licence, "basin": basin, "error": str(e), "count": 0, "performances": []}

    perfs = await fetch_swimmer_perfs(licence, basin)
    result: dict = {
        "licence": licence,
        "basin": basin,
        "html_length": html_length,
        "count": len(perfs),
        "performances": [
            {
                "event": p.event_code,
                "basin": p.basin_type,
                "time": p.time_raw,
                "time_seconds": p.time_seconds,
                "date": str(p.perf_date) if p.perf_date else None,
                "meet": p.meeting_name,
                "fina_points": p.fina_points,
                "is_pb": p.is_pb,
            }
            for p in perfs[:10]
        ],
    }
    if len(perfs) == 0:
        result["html_preview"] = html_preview
    return result
