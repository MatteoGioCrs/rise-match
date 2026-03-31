"""
SwimCloud scraper — httpx only (no Playwright), season 2025-26 (season_id=29).
"""

import asyncio
import re
from datetime import datetime
from typing import Optional

import httpx
from bs4 import BeautifulSoup

from matching.conversion import display_to_seconds, seconds_to_display

BASE_URL = "https://www.swimcloud.com"
CURRENT_SEASON_ID = 29
CURRENT_YEAR = 2026

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "en-US,en;q=0.9",
}

YEAR_MAP: dict[str, int] = {
    "FR": 1, "Fr": 1, "FRESHMAN": 1,
    "SO": 2, "So": 2, "SOPHOMORE": 2,
    "JR": 3, "Jr": 3, "JUNIOR": 3,
    "SR": 4, "Sr": 4, "SENIOR": 4,
    "GR": 5, "Gr": 5, "GRADUATE": 5, "5TH": 5,
}

# SwimCloud event codes for the times URL (pipe-separated: stroke|distance|course)
SWIMCLOUD_EVENT_CODES: dict[str, str] = {
    "50FR":   "1|50|1",
    "100FR":  "1|100|1",
    "200FR":  "1|200|1",
    "500FR":  "1|500|1",
    "1000FR": "1|1000|1",
    "1650FR": "1|1650|1",
    "100BA":  "2|100|1",
    "200BA":  "2|200|1",
    "100BR":  "3|100|1",
    "200BR":  "3|200|1",
    "100FL":  "4|100|1",
    "200FL":  "4|200|1",
    "200IM":  "5|200|1",
    "400IM":  "5|400|1",
}

KEY_EVENTS = ["50FR", "100FR", "200FR", "100BA", "100BR", "200BR", "100FL", "200IM", "400IM"]

# Module-level cache
_cache: dict[int, dict] = {}
CACHE_TTL_HOURS = 24


def get_cached(team_id: int) -> Optional[dict]:
    if team_id in _cache:
        age_h = (datetime.now() - _cache[team_id]["timestamp"]).total_seconds() / 3600
        if age_h < CACHE_TTL_HOURS:
            return _cache[team_id]["data"]
    return None


def _set_cache(team_id: int, data: dict) -> None:
    _cache[team_id] = {"data": data, "timestamp": datetime.now()}


def _parse_time(raw: str) -> Optional[float]:
    raw = raw.strip().replace(",", ".")
    if not raw or raw in ("-", "NT", "DQ", ""):
        return None
    try:
        if ":" in raw:
            parts = raw.split(":")
            return round(int(parts[0]) * 60 + float(parts[1]), 2)
        return round(float(raw), 2)
    except (ValueError, IndexError):
        return None


async def fetch_roster(team_id: int, gender: str = "M") -> list[dict]:
    """
    Fetch 2025-26 roster from SwimCloud using httpx.
    Returns list of {name, study_year, is_senior, is_graduate, is_departing, events, best_times}.
    """
    url = (
        f"{BASE_URL}/team/{team_id}/roster/"
        f"?page=1&gender={gender}&season_id={CURRENT_SEASON_ID}&sort=name"
    )
    await asyncio.sleep(2.0)

    try:
        async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True, timeout=20) as client:
            resp = await client.get(url)
            resp.encoding = "utf-8"
            resp.raise_for_status()
    except Exception as e:
        print(f"[SwimCloud] fetch_roster error team={team_id}: {e}")
        return []

    soup = BeautifulSoup(resp.text, "html.parser")
    athletes: list[dict] = []

    # Try several known card selectors
    cards = (
        soup.select(".c-roster-athlete") or
        soup.select(".roster-athlete") or
        soup.select("[data-athlete-id]") or
        soup.select("tr[data-athlete]") or
        []
    )

    # Fallback: parse table rows if no cards found
    if not cards:
        for row in soup.select("table tbody tr"):
            cells = row.find_all("td")
            if len(cells) < 2:
                continue
            name = cells[0].get_text(strip=True)
            if not name:
                continue
            year_text = cells[1].get_text(strip=True) if len(cells) > 1 else ""
            study_year = YEAR_MAP.get(year_text.upper().strip(), None)
            athletes.append({
                "name": name,
                "study_year": study_year,
                "is_senior": study_year == 4,
                "is_graduate": study_year == 5,
                "is_departing": (study_year or 0) >= 4,
                "events": [],
                "best_times": {},
            })
        return athletes

    for card in cards:
        name_el = card.select_one(
            ".c-roster-athlete__name, .athlete-name, .c-athlete-name, h3, h4, a[href*='/swimmer/']"
        )
        name = name_el.get_text(strip=True) if name_el else None
        if not name:
            continue

        # Year badge
        year_el = card.select_one(
            ".c-roster-athlete__year, .athlete-year, .year-badge, [class*='year']"
        )
        year_text = year_el.get_text(strip=True) if year_el else ""
        # Also scan all text for FR/SO/JR/SR/GR
        if not year_text:
            for t in card.stripped_strings:
                if t.upper() in YEAR_MAP:
                    year_text = t
                    break
        study_year = YEAR_MAP.get(year_text.strip().upper(), YEAR_MAP.get(year_text.strip(), None))

        # Events from badges
        events: list[str] = []
        for badge in card.select(".event-badge, .c-event-badge, .badge, [class*='event']"):
            ev_raw = badge.get_text(strip=True)
            code = _map_sc_event(ev_raw)
            if code and code not in events:
                events.append(code)

        # Best times from table rows
        best_times: dict[str, float] = {}
        for row in card.select("tr, .time-row, .c-time-row"):
            cells = row.find_all("td")
            if len(cells) >= 2:
                ev_raw = cells[0].get_text(strip=True)
                t_raw = cells[1].get_text(strip=True)
                code = _map_sc_event(ev_raw)
                t = _parse_time(t_raw)
                if code and t and 10 < t < 1500:
                    best_times[code] = t

        athletes.append({
            "name": name,
            "study_year": study_year,
            "is_senior": study_year == 4,
            "is_graduate": study_year == 5,
            "is_departing": (study_year or 0) >= 4,
            "events": events,
            "best_times": best_times,
        })

    return athletes


async def fetch_team_best_times(team_id: int, event_code: str, gender: str = "M") -> list[dict]:
    """
    Fetch best times for a team in one event this season (SCY).
    Returns list sorted ascending (fastest first): [{name, time_seconds, time_display, rank}]
    """
    sc_code = SWIMCLOUD_EVENT_CODES.get(event_code)
    if not sc_code:
        return []

    url = (
        f"{BASE_URL}/team/{team_id}/times/"
        f"?dont_group=false"
        f"&event={sc_code}"
        f"&event_course=Y"
        f"&gender={gender}"
        f"&page=1"
        f"&region"
        f"&season_id={CURRENT_SEASON_ID}"
        f"&tag_id"
        f"&team_id={team_id}"
        f"&year={CURRENT_YEAR}"
    )
    await asyncio.sleep(1.5)

    try:
        async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True, timeout=20) as client:
            resp = await client.get(url)
            resp.encoding = "utf-8"
            resp.raise_for_status()
    except Exception as e:
        print(f"[SwimCloud] fetch_team_best_times error team={team_id} event={event_code}: {e}")
        return []

    soup = BeautifulSoup(resp.text, "html.parser")
    results: list[dict] = []

    for row in soup.select("table tbody tr"):
        cells = row.find_all("td")
        if len(cells) < 2:
            continue
        texts = [c.get_text(strip=True) for c in cells]

        # Find time: first cell that parses as a valid swimming time
        time_s = None
        for t in texts:
            parsed = _parse_time(t)
            if parsed and 10 < parsed < 1500:
                time_s = parsed
                break
        if time_s is None:
            continue

        # Name: longest non-time text
        name = max((t for t in texts if not _parse_time(t) and len(t) > 2), key=len, default="")

        results.append({
            "name": name,
            "time_seconds": time_s,
            "time_display": seconds_to_display(time_s),
            "rank": len(results) + 1,
        })

    results.sort(key=lambda x: x["time_seconds"])
    for i, r in enumerate(results):
        r["rank"] = i + 1

    return results


async def fetch_university_snapshot(team_id: int, gender: str = "M") -> dict:
    """
    Full university data snapshot for the matching algorithm.
    Tries live SwimCloud data; returns structured dict with roster + best times.
    """
    cached = get_cached(team_id)
    if cached:
        return cached

    # 1. Fetch roster
    roster = await fetch_roster(team_id, gender)
    departing = [a for a in roster if a.get("is_departing")]

    # 2. Fetch best times for key events
    best_times: dict[str, dict] = {}
    team_top8: dict[str, float] = {}

    for event in KEY_EVENTS:
        times_list = await fetch_team_best_times(team_id, event, gender)
        if times_list:
            best_times[event] = times_list[0]
            # 8th place = conference scoring cutoff estimate
            if len(times_list) >= 8:
                team_top8[event] = times_list[7]["time_seconds"]
            elif times_list:
                team_top8[event] = times_list[-1]["time_seconds"]

    # 3. Identify events where departing athletes hold the top spot
    departing_names = {a["name"] for a in departing}
    departing_events: list[str] = []
    for ev, bt in best_times.items():
        if bt.get("name") in departing_names:
            departing_events.append(ev)

    # Enrich departing athletes with their best events
    for a in departing:
        a_events: list[str] = list(a.get("events", []))
        for ev, bt in best_times.items():
            if bt.get("name") == a["name"] and ev not in a_events:
                a_events.append(ev)
        a["events"] = a_events

    snapshot = {
        "team_id": team_id,
        "season": f"{CURRENT_YEAR - 1}-{str(CURRENT_YEAR)[2:]}",
        "roster_count": len(roster),
        "roster_all": roster,
        "departing_athletes": departing,
        "best_times": best_times,
        "team_top8_times": team_top8,
        "departing_events": departing_events,
    }
    _set_cache(team_id, snapshot)
    return snapshot


def _map_sc_event(raw: str) -> Optional[str]:
    """Map SwimCloud display name or common abbreviation to internal event code."""
    mapping = {
        "50 Free": "50FR", "100 Free": "100FR", "200 Free": "200FR",
        "400 Free": "400FR", "500 Free": "500FR", "1000 Free": "1000FR",
        "1650 Free": "1650FR",
        "100 Back": "100BA", "200 Back": "200BA",
        "100 Breast": "100BR", "200 Breast": "200BR",
        "100 Fly": "100FL", "200 Fly": "200FL",
        "200 IM": "200IM", "400 IM": "400IM",
        "50 FR": "50FR", "100 FR": "100FR", "200 FR": "200FR",
        "100 BA": "100BA", "100 BR": "100BR", "200 BR": "200BR",
        "100 FL": "100FL", "200 IM": "200IM",
    }
    if raw in mapping:
        return mapping[raw]
    # Try regex pattern like "100 Breast" or "100BR"
    m = re.match(r"(\d+)\s*(Free|Back|Breast|Fly|IM|FR|BA|BR|FL)", raw, re.IGNORECASE)
    if m:
        dist = m.group(1)
        stroke_raw = m.group(2).upper()
        stroke_map = {
            "FREE": "FR", "FR": "FR",
            "BACK": "BA", "BA": "BA",
            "BREAST": "BR", "BR": "BR",
            "FLY": "FL", "FL": "FL",
            "IM": "IM",
        }
        stroke = stroke_map.get(stroke_raw, stroke_raw)
        return dist + stroke
    return None


# Keep old name for backward compat
async def fetch_conference_results(team_id: int, season: str = "2025-2026") -> list[dict]:
    """Fetch conference results — delegates to fetch_university_snapshot."""
    snap = await fetch_university_snapshot(team_id)
    results = []
    for ev, cutoff in snap.get("team_top8_times", {}).items():
        best = snap.get("best_times", {}).get(ev, {})
        results.append({
            "event_code": ev,
            "gender": "M",
            "winning_time": best.get("time_seconds"),
            "cutoff_time": cutoff,
        })
    return results
