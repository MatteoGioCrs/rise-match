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
    basin: str = Query("ALL", description="LCM, SCM, ou ALL"),
):
    """
    Fetch performances for a FFN licence from Extranat.
    basin=ALL fetches both LCM and SCM tables.
    """
    from scrapers.ffn_scraper import fetch_swimmer_perfs

    results = await fetch_swimmer_perfs(licence, basin)
    return {
        "licence": licence,
        "count": len(results),
        "by_basin": {
            "LCM": len([r for r in results if r["basin"] == "LCM"]),
            "SCM": len([r for r in results if r["basin"] == "SCM"]),
        },
        "performances": results[:20],
    }
