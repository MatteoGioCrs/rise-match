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
