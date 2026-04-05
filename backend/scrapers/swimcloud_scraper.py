"""
SwimCloud scraper — curl_cffi (Chrome TLS impersonation), season 2025-26 (season_id=29).

curl_cffi bypasses Cloudflare at the TLS fingerprint level.
httpx was replaced because it produces Cloudflare 403 on all SwimCloud requests.
"""

import asyncio
import re
from datetime import datetime
from typing import Optional

from bs4 import BeautifulSoup
from curl_cffi.requests import AsyncSession

from matching.conversion import display_to_seconds, seconds_to_display

BASE_URL = "https://www.swimcloud.com"
CURRENT_SEASON_ID = 29
CURRENT_YEAR = 2026

_CF_HEADERS = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Cache-Control": "max-age=0",
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

# Module-level cache: {team_id: {"data": ..., "timestamp": datetime}}
_cache: dict[int, dict] = {}
CACHE_TTL_HOURS = 24

# Module-level team database (populated by build_full_team_database)
_team_db: dict[int, dict] = {}

# ─── Correct division listing URLs (season_id=29) ─────────────────────────────
DIVISION_URLS: dict[str, str] = {
    "D1":      f"{BASE_URL}/country/usa/college/division/1/teams/?eventCourse=Y&gender=M&page={{page}}&rankType=D&region=division_1&seasonId=29&sortBy=top50",
    "D2":      f"{BASE_URL}/country/usa/college/division/2/teams/?eventCourse=Y&gender=M&page={{page}}&rankType=D&region=division_2&seasonId=29&sortBy=top50",
    "D3":      f"{BASE_URL}/country/usa/college/division/3/teams/?eventCourse=Y&gender=M&page={{page}}&rankType=D&region=division_3&seasonId=29&sortBy=top50",
    "NAIA":    f"{BASE_URL}/country/usa/college/division/naia/teams/?eventCourse=Y&gender=M&page={{page}}&rankType=D&region=division_4&seasonId=29&sortBy=top50",
    "NJCAA":   f"{BASE_URL}/country/usa/college/division/njcaa/teams/?eventCourse=Y&gender=M&page={{page}}&rankType=D&region=division_5&seasonId=29&sortBy=top50",
    "USports": f"{BASE_URL}/country/can/college/division/u-sports/teams/?eventCourse=L&gender=M&page={{page}}&region=division_10&seasonId=29&sortBy=top50",
}


# ─── Core HTTP transport ───────────────────────────────────────────────────────

async def _get_page(url: str) -> str:
    """
    Fetch a SwimCloud page bypassing Cloudflare.
    curl_cffi impersonates Chrome's TLS fingerprint — Cloudflare cannot detect it as a bot.
    Raises on HTTP error so callers can catch and degrade gracefully.
    """
    async with AsyncSession(impersonate="chrome120") as session:
        r = await session.get(url, headers=_CF_HEADERS, timeout=15)
        r.raise_for_status()
        return r.text


# ─── Cache helpers ─────────────────────────────────────────────────────────────

def get_cached(team_id: int) -> Optional[dict]:
    if team_id in _cache:
        age_h = (datetime.now() - _cache[team_id]["timestamp"]).total_seconds() / 3600
        if age_h < CACHE_TTL_HOURS:
            return _cache[team_id]["data"]
    return None


def _set_cache(team_id: int, data: dict) -> None:
    _cache[team_id] = {"data": data, "timestamp": datetime.now()}


# ─── Parsing helpers ───────────────────────────────────────────────────────────

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


def _map_sc_event(raw: str) -> Optional[str]:
    """Map SwimCloud display name to internal event code."""
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
        "100 FL": "100FL",
    }
    if raw in mapping:
        return mapping[raw]
    m = re.match(r"(\d+)\s*(Free|Back|Breast|Fly|IM|FR|BA|BR|FL)", raw, re.IGNORECASE)
    if m:
        dist = m.group(1)
        stroke_map = {
            "FREE": "FR", "FR": "FR", "BACK": "BA", "BA": "BA",
            "BREAST": "BR", "BR": "BR", "FLY": "FL", "FL": "FL", "IM": "IM",
        }
        return dist + stroke_map.get(m.group(2).upper(), m.group(2).upper())
    return None


# ─── Roster ────────────────────────────────────────────────────────────────────

async def fetch_roster(team_id: int, gender: str = "M") -> list[dict]:
    """
    Fetch 2025-26 roster from SwimCloud using curl_cffi (Chrome TLS impersonation).
    Returns list of {name, study_year, is_senior, is_graduate, is_departing, events, best_times}.
    """
    url = (
        f"{BASE_URL}/team/{team_id}/roster/"
        f"?page=1&gender={gender}&season_id={CURRENT_SEASON_ID}&sort=name"
    )

    try:
        html = await _get_page(url)
        await asyncio.sleep(2)
    except Exception as e:
        print(f"[SwimCloud] fetch_roster failed team={team_id}: {e}")
        return []

    soup = BeautifulSoup(html, "html.parser")
    athletes: list[dict] = []

    # Strategy 1: card-based layout
    cards = (
        soup.select(".c-roster-athlete") or
        soup.select(".roster-athlete") or
        soup.select("[data-athlete-id]") or
        soup.select("tr[data-athlete]") or
        []
    )

    # Strategy 2: table rows fallback
    if not cards:
        print(f"[SwimCloud] No cards found for team={team_id}, trying table rows. HTML len={len(html)}")
        for row in soup.select("table tbody tr"):
            cells = row.find_all("td")
            if len(cells) < 2:
                continue
            name = cells[0].get_text(strip=True)
            if not name:
                continue
            year_text = cells[1].get_text(strip=True) if len(cells) > 1 else ""
            study_year = YEAR_MAP.get(year_text.strip().upper()) or YEAR_MAP.get(year_text.strip())
            athletes.append({
                "name": name,
                "study_year": study_year,
                "is_senior": study_year == 4,
                "is_graduate": study_year == 5,
                "is_departing": (study_year or 0) >= 4,
                "events": [],
                "best_times": {},
            })
        print(f"[SwimCloud] Roster team={team_id}: {len(athletes)} athletes (table fallback)")
        return athletes

    for card in cards:
        name_el = card.select_one(
            ".c-roster-athlete__name, .athlete-name, .c-athlete-name, h3, h4, a[href*='/swimmer/']"
        )
        name = name_el.get_text(strip=True) if name_el else None
        if not name:
            continue

        year_el = card.select_one(
            ".c-roster-athlete__year, .athlete-year, .year-badge, [class*='year']"
        )
        year_text = year_el.get_text(strip=True) if year_el else ""
        if not year_text:
            for t in card.stripped_strings:
                if t.upper() in YEAR_MAP:
                    year_text = t
                    break
        study_year = YEAR_MAP.get(year_text.strip().upper()) or YEAR_MAP.get(year_text.strip())

        events: list[str] = []
        for badge in card.select(".event-badge, .c-event-badge, .badge, [class*='event']"):
            code = _map_sc_event(badge.get_text(strip=True))
            if code and code not in events:
                events.append(code)

        best_times: dict[str, float] = {}
        for row in card.select("tr, .time-row, .c-time-row"):
            cells = row.find_all("td")
            if len(cells) >= 2:
                code = _map_sc_event(cells[0].get_text(strip=True))
                t = _parse_time(cells[1].get_text(strip=True))
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

    print(f"[SwimCloud] Roster team={team_id}: {len(athletes)} athletes")
    return athletes


# ─── Best times ────────────────────────────────────────────────────────────────

async def fetch_team_best_times(team_id: int, event_code: str, gender: str = "M") -> list[dict]:
    """
    Fetch best times for a team in one event this season (SCY).
    Returns list sorted ascending: [{name, time_seconds, time_display, rank}].
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

    try:
        html = await _get_page(url)
        await asyncio.sleep(2)
    except Exception as e:
        print(f"[SwimCloud] fetch_team_best_times failed team={team_id} event={event_code}: {e}")
        return []

    soup = BeautifulSoup(html, "html.parser")
    results: list[dict] = []

    for row in soup.select("table tbody tr"):
        cells = row.find_all("td")
        if len(cells) < 2:
            continue
        texts = [c.get_text(strip=True) for c in cells]

        time_s = None
        for t in texts:
            parsed = _parse_time(t)
            if parsed and 10 < parsed < 1500:
                time_s = parsed
                break
        if time_s is None:
            continue

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

    print(f"[SwimCloud] Times team={team_id} {event_code}: {len(results)} entries")
    return results


# ─── Snapshot ─────────────────────────────────────────────────────────────────

async def fetch_university_snapshot(team_id: int, gender: str = "M") -> dict:
    """
    Full university data snapshot for the matching algorithm.
    Fetches roster + best times; caches for 24h.
    """
    cached = get_cached(team_id)
    if cached:
        return cached

    roster = await fetch_roster(team_id, gender)
    departing = [a for a in roster if a.get("is_departing")]

    best_times: dict[str, dict] = {}
    team_top8: dict[str, float] = {}

    for event in KEY_EVENTS:
        times_list = await fetch_team_best_times(team_id, event, gender)
        if times_list:
            best_times[event] = times_list[0]
            if len(times_list) >= 8:
                team_top8[event] = times_list[7]["time_seconds"]
            else:
                team_top8[event] = times_list[-1]["time_seconds"]

    departing_names = {a["name"] for a in departing}
    departing_events: list[str] = []
    for ev, bt in best_times.items():
        if bt.get("name") in departing_names:
            departing_events.append(ev)

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


# ─── Division scraping ─────────────────────────────────────────────────────────

async def scrape_division_teams(
    division: str,
    gender: str = "M",
    max_pages: int = 20,
) -> list[dict]:
    """
    Scrape team listing for one division from SwimCloud.
    Returns list of {team_id, name, division, country}.
    """
    url_template = DIVISION_URLS.get(division)
    if not url_template:
        return []

    teams: list[dict] = []
    seen_ids: set[int] = set()

    for page in range(1, max_pages + 1):
        url = url_template.format(page=page)
        try:
            html = await _get_page(url)
            await asyncio.sleep(2)
        except Exception as e:
            print(f"[SwimCloud] scrape_division_teams {division} page={page}: {e}")
            break

        soup = BeautifulSoup(html, "html.parser")
        page_teams = []

        for a in soup.find_all("a", href=re.compile(r"/team/(\d+)/")):
            m = re.search(r"/team/(\d+)/", a["href"])
            if not m:
                continue
            tid = int(m.group(1))
            if tid in seen_ids:
                continue
            seen_ids.add(tid)
            name = a.get_text(strip=True) or f"Team {tid}"
            page_teams.append({
                "team_id": tid,
                "name": name,
                "division": division,
                "country": "CAN" if division in ("USports", "ACAC") else "USA",
            })

        if not page_teams:
            break
        teams.extend(page_teams)

    return teams


async def build_full_team_database(
    gender: str = "M",
    divisions: Optional[list[str]] = None,
    max_pages_per_division: int = 20,
) -> dict[int, dict]:
    """
    Build a complete {team_id: info} dict by scraping all division pages.
    Stores results in module-level _team_db cache.
    """
    global _team_db
    target_divisions = divisions or list(DIVISION_URLS.keys())

    for division in target_divisions:
        print(f"[SwimCloud] scraping division={division} gender={gender}…")
        teams = await scrape_division_teams(division, gender, max_pages_per_division)
        for t in teams:
            _team_db[t["team_id"]] = t
        print(f"[SwimCloud] division={division}: {len(teams)} teams found")

    return dict(_team_db)


def get_team_database() -> dict[int, dict]:
    return dict(_team_db)


# ─── Backwards compat ─────────────────────────────────────────────────────────

async def fetch_conference_results(team_id: int, season: str = "2025-2026") -> list[dict]:
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
