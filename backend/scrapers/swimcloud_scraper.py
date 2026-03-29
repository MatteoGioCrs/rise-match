"""
SwimCloud scraper.
Fetches team rosters (JS-rendered via Playwright) and conference results (static HTML via httpx).
"""

import asyncio
import random
import re
from typing import Optional

import httpx
from bs4 import BeautifulSoup

BASE_URL = "https://www.swimcloud.com"

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
]

YEAR_MAP: dict[str, int] = {
    "FR": 1, "Fr": 1, "FRESHMAN": 1,
    "SO": 2, "So": 2, "SOPHOMORE": 2,
    "JR": 3, "Jr": 3, "JUNIOR": 3,
    "SR": 4, "Sr": 4, "SENIOR": 4,
    "GR": 5, "Gr": 5, "GRADUATE": 5, "5TH": 5,
}

# Event code mapping for SwimCloud display names
SC_EVENT_MAP: dict[str, str] = {
    "50 Free": "50FR",   "100 Free": "100FR", "200 Free": "200FR",
    "400 Free": "400FR", "500 Free": "500FR", "1000 Free": "1000FR",
    "1650 Free": "1650FR",
    "100 Back": "100BA", "200 Back": "200BA",
    "100 Breast": "100BR", "200 Breast": "200BR",
    "100 Fly": "100FL",  "200 Fly": "200FL",
    "200 IM": "200IM",   "400 IM": "400IM",
}


def _random_headers() -> dict:
    return {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }


def _parse_time_scy(raw: str) -> Optional[float]:
    raw = raw.strip().replace(",", ".")
    if not raw or raw in ("-", "NT", "DQ"):
        return None
    try:
        if ":" in raw:
            parts = raw.split(":")
            return round(int(parts[0]) * 60 + float(parts[1]), 2)
        return round(float(raw), 2)
    except (ValueError, IndexError):
        return None


async def fetch_roster(team_id: int) -> list[dict]:
    """
    Use Playwright to fetch JS-rendered roster page.
    Parses athlete cards: name, study year, events, best times (SCY).
    """
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        raise RuntimeError("playwright not installed — run: playwright install chromium")

    url = f"{BASE_URL}/team/{team_id}/roster/"
    athletes = []

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        ctx = await browser.new_context(
            user_agent=random.choice(USER_AGENTS),
            viewport={"width": 1280, "height": 900},
        )
        page = await ctx.new_page()

        await page.goto(url, wait_until="networkidle", timeout=30000)

        try:
            await page.wait_for_selector(".c-roster-athlete, .roster-athlete, [data-athlete]", timeout=10000)
        except Exception:
            pass  # Parse whatever loaded

        content = await page.content()
        await browser.close()

    soup = BeautifulSoup(content, "html.parser")

    # Try multiple card selectors (SwimCloud changes layout occasionally)
    cards = (
        soup.select(".c-roster-athlete") or
        soup.select(".roster-athlete") or
        soup.select("[data-athlete]") or
        []
    )

    for card in cards:
        name_el = card.select_one(".c-roster-athlete__name, .athlete-name, h3, h4")
        name = name_el.get_text(strip=True) if name_el else None
        if not name:
            continue

        year_el = card.select_one(".c-roster-athlete__year, .athlete-year, .year")
        year_text = year_el.get_text(strip=True) if year_el else ""
        study_year = YEAR_MAP.get(year_text.strip(), None)

        # Events
        events = []
        for badge in card.select(".event-badge, .c-event-badge, .badge"):
            ev_raw = badge.get_text(strip=True)
            code = SC_EVENT_MAP.get(ev_raw, ev_raw)
            events.append(code)

        # Best times
        best_times: dict[str, float] = {}
        for row in card.select("tr, .time-row"):
            cells = row.find_all("td")
            if len(cells) >= 2:
                ev_raw = cells[0].get_text(strip=True)
                t_raw = cells[1].get_text(strip=True)
                code = SC_EVENT_MAP.get(ev_raw, ev_raw)
                t = _parse_time_scy(t_raw)
                if t:
                    best_times[code] = t

        athletes.append({
            "name": name,
            "study_year": study_year,
            "is_senior": study_year == 4,
            "events": events,
            "best_times": best_times,
        })

    return athletes


async def fetch_conference_results(team_id: int, season: str = "2024-2025") -> list[dict]:
    """
    Fetch latest conference championship results for this team.
    Extracts by event: winning_time, 8th place cutoff, team rank, points.
    """
    url = f"{BASE_URL}/team/{team_id}/results/"
    await asyncio.sleep(random.uniform(2, 3))

    async with httpx.AsyncClient(headers=_random_headers(), follow_redirects=True, timeout=20) as client:
        resp = await client.get(url)
        resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")
    results = []

    # Find conference championship meet
    conf_section = None
    for section in soup.select(".meet-section, .meet-results, article"):
        text = section.get_text()
        if any(kw in text for kw in ["Conference", "Championship", "Conf Champs", "GNAC", "Big Ten", "SEC", "PAC", "ACC"]):
            conf_section = section
            break

    target = conf_section or soup

    for row in target.select("tr.event-row, tr"):
        cells = row.find_all("td")
        if len(cells) < 4:
            continue
        texts = [c.get_text(strip=True) for c in cells]

        # Detect gender from context
        gender = "M"
        row_class = " ".join(row.get("class", []))
        if "women" in row_class.lower() or "female" in row_class.lower():
            gender = "F"

        ev_raw = texts[0]
        code = SC_EVENT_MAP.get(ev_raw) or ev_raw

        times = []
        for t in texts[1:]:
            parsed = _parse_time_scy(t)
            if parsed and 20 < parsed < 1200:
                times.append(parsed)

        if len(times) >= 2:
            results.append({
                "event_code": code,
                "gender": gender,
                "winning_time": times[0],
                "cutoff_time": times[-1] if len(times) >= 8 else times[min(7, len(times) - 1)],
                "rank": None,
                "team_points": None,
            })

    return results


async def search_team_by_name(university_name: str) -> dict:
    """
    Search SwimCloud for a university team.
    Returns {team_id, name, conference, division}.
    """
    query = university_name.replace(" ", "+")
    url = f"{BASE_URL}/teams/?q={query}"
    await asyncio.sleep(random.uniform(1, 2))

    async with httpx.AsyncClient(headers=_random_headers(), follow_redirects=True, timeout=20) as client:
        resp = await client.get(url)
        resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")

    for card in soup.select(".team-card, .c-team-card, [data-team-id]"):
        name_el = card.select_one(".team-name, h3, h4")
        name = name_el.get_text(strip=True) if name_el else ""

        # Get team_id from link href
        link = card.select_one("a[href*='/team/']")
        team_id = None
        if link:
            m = re.search(r"/team/(\d+)/", link.get("href", ""))
            if m:
                team_id = int(m.group(1))

        conf_el = card.select_one(".conference, .conf")
        conference = conf_el.get_text(strip=True) if conf_el else None

        div_el = card.select_one(".division, .div")
        division = div_el.get_text(strip=True) if div_el else None

        if team_id:
            return {
                "team_id": team_id,
                "name": name,
                "conference": conference,
                "division": division,
            }

    return {}
