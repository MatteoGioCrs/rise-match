"""
World Aquatics API — source primaire pour les temps des nageurs français.
API publique, pas d'authentification requise.

URL pattern:
  https://api.worldaquatics.com/fina/rankings/swimming/report/csv
    ?gender={M|F}
    &distance={50|100|200|400|800|1500}
    &stroke={FREESTYLE|BREASTSTROKE|BACKSTROKE|BUTTERFLY|MEDLEY}
    &poolConfiguration={LCM|SCM}
    &countryId=FRA
    &timesMode=BEST_TIMES
    &pageSize=200
"""

import asyncio
import csv
import io
from datetime import datetime
from typing import Optional

import httpx

BASE_URL = "https://api.worldaquatics.com/fina/rankings/swimming/report/csv"

STROKE_MAP: dict[str, str] = {
    "FR": "FREESTYLE",
    "BA": "BACKSTROKE",
    "BR": "BREASTSTROKE",
    "FL": "BUTTERFLY",
    "IM": "MEDLEY",
}

# LCM distance for each SCY event code
DISTANCE_MAP: dict[str, int] = {
    "50FR": 50, "100FR": 100, "200FR": 200,
    "400FR": 400, "800FR": 800, "1500FR": 1500,
    "100BA": 100, "200BA": 200,
    "100BR": 100, "200BR": 200,
    "100FL": 100, "200FL": 200,
    "200IM": 200, "400IM": 400,
}

_POLITE_DELAY = 0.3  # seconds between API calls


def _get_stroke(event_code: str) -> str:
    for suffix, stroke in STROKE_MAP.items():
        if event_code.endswith(suffix):
            return stroke
    return "FREESTYLE"


def _parse_time(time_str: str) -> Optional[float]:
    try:
        time_str = time_str.strip()
        if not time_str:
            return None
        if ":" in time_str:
            parts = time_str.split(":")
            return round(float(parts[0]) * 60 + float(parts[1]), 2)
        return round(float(time_str), 2)
    except Exception:
        return None


def _seconds_to_display(s: float) -> str:
    if s >= 60:
        m = int(s // 60)
        sec = s % 60
        return f"{m}:{sec:05.2f}"
    return f"{s:.2f}"


def _parse_date(date_str: str) -> str:
    """Try common date formats; return ISO string or original."""
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%m/%d/%Y"):
        try:
            return datetime.strptime(date_str.strip(), fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return date_str.strip()


async def fetch_french_times(
    event_code: str,
    pool_config: str = "LCM",
    gender: str = "M",
    country_id: str = "FRA",
    page_size: int = 200,
) -> list[dict]:
    """
    Fetch best times for a country/event from World Aquatics rankings CSV.

    Returns list of:
    {name, birth_date, time_seconds, time_display, basin, event,
     meet, date, fina_points, country, rank}
    """
    distance = DISTANCE_MAP.get(event_code)
    if not distance:
        print(f"[WorldAquatics] Unknown event: {event_code}")
        return []

    stroke = _get_stroke(event_code)
    gender_param = "M" if gender == "M" else "W"

    params = {
        "gender": gender_param,
        "distance": distance,
        "stroke": stroke,
        "poolConfiguration": pool_config,
        "countryId": country_id,
        "timesMode": "BEST_TIMES",
        "pageSize": page_size,
    }

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(BASE_URL, params=params)
            r.raise_for_status()
            csv_text = r.text
    except Exception as e:
        print(f"[WorldAquatics] fetch failed ({event_code} {pool_config}): {e}")
        return []

    results = []
    try:
        reader = csv.DictReader(io.StringIO(csv_text))
        for row in reader:
            time_s = _parse_time(row.get("swim_time", ""))
            if not time_s:
                continue

            results.append({
                "name":         row.get("full_name_computed", "").strip(),
                "birth_date":   _parse_date(row.get("birth_date", "")),
                "time_seconds": time_s,
                "time_display": _seconds_to_display(time_s),
                "basin":        pool_config,
                "event":        event_code,
                "meet":         row.get("meet_name", "").strip(),
                "date":         _parse_date(row.get("swim_date", "")),
                "fina_points":  int(row.get("fina_points", 0) or 0),
                "country":      row.get("country_code", country_id),
                "rank":         int(row.get("RANK", 0) or 0),
            })
    except Exception as e:
        print(f"[WorldAquatics] CSV parse failed ({event_code}): {e}")
        return []

    print(f"[WorldAquatics] {event_code} {pool_config} {country_id}: {len(results)} results")
    return results


async def search_swimmer_times(
    name: str,
    country_id: str = "FRA",
    events: Optional[list[str]] = None,
    gender: str = "M",
) -> dict:
    """
    Find all best times for a swimmer by name.
    Searches LCM and SCM across all requested events.

    Returns:
    {
        swimmer: {name, birth_date} | None,
        times: [{event, basin, time_seconds, time_display, date, meet, fina_points}],
        source: "World Aquatics API",
    }
    """
    if events is None:
        events = list(DISTANCE_MAP.keys())

    name_upper = name.upper().strip()
    name_parts = name_upper.split()

    all_times: list[dict] = []
    swimmer_info: Optional[dict] = None

    for event in events:
        for basin in ("LCM", "SCM"):
            results = await fetch_french_times(event, basin, gender, country_id)
            await asyncio.sleep(_POLITE_DELAY)

            for r in results:
                r_name = r["name"].upper()
                if all(part in r_name for part in name_parts):
                    if swimmer_info is None:
                        swimmer_info = {"name": r["name"], "birth_date": r["birth_date"]}
                    all_times.append({
                        "event":        r["event"],
                        "basin":        r["basin"],
                        "time_seconds": r["time_seconds"],
                        "time_display": r["time_display"],
                        "date":         r["date"],
                        "meet":         r["meet"],
                        "fina_points":  r["fina_points"],
                    })

    # Keep only PB per (event, basin)
    seen: dict[tuple, dict] = {}
    for t in all_times:
        key = (t["event"], t["basin"])
        if key not in seen or t["time_seconds"] < seen[key]["time_seconds"]:
            seen[key] = t

    return {
        "swimmer": swimmer_info,
        "times":   sorted(seen.values(), key=lambda x: (x["event"], x["basin"])),
        "source":  "World Aquatics API",
    }


async def get_swimmer_history(
    name: str,
    event: str,
    country_id: str = "FRA",
    gender: str = "M",
) -> list[dict]:
    """
    Return full history of a swimmer for one event (for progression curve).
    Searches both LCM and SCM.
    """
    name_upper = name.upper().strip()
    name_parts = name_upper.split()
    history: list[dict] = []

    for basin in ("LCM", "SCM"):
        results = await fetch_french_times(event, basin, gender, country_id)
        for r in results:
            if all(part in r["name"].upper() for part in name_parts):
                history.append(r)

    return sorted(history, key=lambda x: x.get("date", ""))
