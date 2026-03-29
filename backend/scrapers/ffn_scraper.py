"""
FFN Extranat scraper.
Fetches swimmer performances from the French swimming federation's public results website.
Uses httpx async + BeautifulSoup4.
"""

import asyncio
import re
from dataclasses import dataclass
from datetime import date
from typing import Optional

import httpx
from bs4 import BeautifulSoup

BASE_URL = "https://ffn.extranat.fr/webffn/"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; research bot)",
    "Accept-Language": "fr-FR,fr;q=0.9",
}
REQUEST_DELAY = 1.5  # seconds between requests


@dataclass
class Performance:
    event_code: str
    basin_type: str   # 'LCM', 'SCM', 'SCY'
    time_seconds: float
    time_raw: str
    perf_date: Optional[date]
    meeting_name: Optional[str]
    fina_points: Optional[int]
    is_pb: bool


def _parse_time(raw: str) -> Optional[float]:
    """Convert '1:02.41' or '57.80' to float seconds."""
    raw = raw.strip().replace(",", ".")
    if not raw or raw in ("-", "NT", "DQ", ""):
        return None
    try:
        if ":" in raw:
            parts = raw.split(":")
            return int(parts[0]) * 60 + float(parts[1])
        return float(raw)
    except (ValueError, IndexError):
        return None


def _normalise_event(raw: str) -> Optional[str]:
    """Map FFN event names to internal codes like '100BR', '200FR'."""
    raw = raw.strip().upper()
    mapping = {
        "50 M NAGE LIBRE": "50FR",   "50 NL": "50FR",
        "100 M NAGE LIBRE": "100FR", "100 NL": "100FR",
        "200 M NAGE LIBRE": "200FR", "200 NL": "200FR",
        "400 M NAGE LIBRE": "400FR", "400 NL": "400FR",
        "800 M NAGE LIBRE": "800FR", "800 NL": "800FR",
        "1500 M NAGE LIBRE": "1500FR","1500 NL": "1500FR",
        "50 M DOS": "50BA",  "50 DO": "50BA",
        "100 M DOS": "100BA","100 DO": "100BA",
        "200 M DOS": "200BA","200 DO": "200BA",
        "50 M BRASSE": "50BR",  "50 BR": "50BR",
        "100 M BRASSE": "100BR","100 BR": "100BR",
        "200 M BRASSE": "200BR","200 BR": "200BR",
        "50 M PAPILLON": "50FL", "50 PA": "50FL",
        "100 M PAPILLON": "100FL","100 PA": "100FL",
        "200 M PAPILLON": "200FL","200 PA": "200FL",
        "200 M 4 NAGES": "200IM","200 4N": "200IM",
        "400 M 4 NAGES": "400IM","400 4N": "400IM",
    }
    for key, code in mapping.items():
        if key in raw or raw == key:
            return code
    # Try numeric prefix + stroke abbrev
    m = re.match(r"(\d+)\s*[MX]?\s*(NL|BR|DO|PA|4N)", raw)
    if m:
        dist = m.group(1)
        stroke_map = {"NL": "FR", "BR": "BR", "DO": "BA", "PA": "FL", "4N": "IM"}
        return dist + stroke_map.get(m.group(2), "")
    return raw[:10] if raw else None


def _basin_from_text(text: str) -> str:
    text = text.strip().upper()
    if "50M" in text or "50 M" in text or "GRAND BASSIN" in text:
        return "LCM"
    if "25M" in text or "25 M" in text or "PETIT BASSIN" in text:
        return "SCM"
    return "LCM"


async def search_swimmer(nom: str, prenom: str) -> list[dict]:
    """
    Search FFN Extranat by name.
    Returns list of {licence, name, club, birth_year}.
    """
    async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True, timeout=20) as client:
        resp = await client.post(
            BASE_URL + "nat_recherche.php",
            params={"idact": "nat"},
            data={"nom": nom, "prenom": prenom},
        )
        resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")
    results = []

    # FFN result table varies — parse rows with licence-like IDs
    for row in soup.select("table tr"):
        cells = row.find_all("td")
        if len(cells) >= 4:
            licence = cells[0].get_text(strip=True)
            name = cells[1].get_text(strip=True)
            club = cells[2].get_text(strip=True)
            birth_year_text = cells[3].get_text(strip=True)
            birth_year = int(birth_year_text) if birth_year_text.isdigit() else None
            if licence and name:
                results.append({
                    "licence": licence,
                    "name": name,
                    "club": club,
                    "birth_year": birth_year,
                })

    return results


async def fetch_swimmer_perfs(licence_id: str) -> list[Performance]:
    """
    Fetch all performances for a licence number since 2018.
    Parses the HTML table: event, basin (50m/25m), time, date, meeting, FINA points.
    Detects personal bests.
    """
    url = BASE_URL + "nat_recherche.php"
    params = {"idact": "nat", "go": "perf", "id": licence_id}

    await asyncio.sleep(REQUEST_DELAY)

    async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True, timeout=30) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")
    performances: list[Performance] = []

    # Parse performance tables — FFN groups by event
    for table in soup.select("table.tableau, table.resultats, table"):
        rows = table.find_all("tr")
        current_event = None
        current_basin = "LCM"

        for row in rows:
            # Header rows often contain event name
            header_cells = row.find_all("th")
            if header_cells:
                header_text = " ".join(c.get_text(strip=True) for c in header_cells).upper()
                ev = _normalise_event(header_text)
                if ev:
                    current_event = ev
                current_basin = _basin_from_text(header_text)
                continue

            cells = row.find_all("td")
            if len(cells) < 3 or not current_event:
                continue

            texts = [c.get_text(strip=True) for c in cells]

            # Detect PB marker
            is_pb = any(
                cls in row.get("class", []) or "pb" in row.get("class", [""])
                for cls in ["pb", "record", "perf_pb"]
            ) or any("PB" in t or "REC" in t for t in texts)

            # Try to extract time (first numeric-looking cell)
            time_raw = None
            time_seconds = None
            for t in texts:
                parsed = _parse_time(t)
                if parsed and 10 < parsed < 1200:
                    time_raw = t
                    time_seconds = parsed
                    break

            if time_seconds is None:
                continue

            # Date: look for DD/MM/YYYY or YYYY-MM-DD
            perf_date = None
            for t in texts:
                for fmt in [r"(\d{2})/(\d{2})/(\d{4})", r"(\d{4})-(\d{2})-(\d{2})"]:
                    m = re.search(fmt, t)
                    if m:
                        try:
                            g = m.groups()
                            if len(g[0]) == 4:
                                perf_date = date(int(g[0]), int(g[1]), int(g[2]))
                            else:
                                perf_date = date(int(g[2]), int(g[1]), int(g[0]))
                        except ValueError:
                            pass
                        break
                if perf_date:
                    break

            if perf_date and perf_date.year < 2018:
                continue

            # Meeting name: longest text field
            meeting_name = max(texts, key=len) if texts else None

            # FINA points: integer in texts
            fina_points = None
            for t in texts:
                if t.isdigit() and 100 <= int(t) <= 1200:
                    fina_points = int(t)

            performances.append(
                Performance(
                    event_code=current_event,
                    basin_type=current_basin,
                    time_seconds=time_seconds,
                    time_raw=time_raw or "",
                    perf_date=perf_date,
                    meeting_name=meeting_name,
                    fina_points=fina_points,
                    is_pb=is_pb,
                )
            )

    return performances


async def get_national_ranking(event_code: str, season: int, gender: str) -> list[dict]:
    """
    Get national ranking for an event.
    Returns [{rank, licence, name, club, time_seconds}].
    """
    params = {"idact": "nat", "idsai": str(season)}
    await asyncio.sleep(REQUEST_DELAY)

    async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True, timeout=30) as client:
        resp = await client.get(BASE_URL + "nat_rankings.php", params=params)
        resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")
    ranking = []

    for i, row in enumerate(soup.select("table tr")):
        cells = row.find_all("td")
        if len(cells) < 4:
            continue
        texts = [c.get_text(strip=True) for c in cells]
        time_s = _parse_time(texts[-1]) or _parse_time(texts[-2])
        if time_s:
            ranking.append({
                "rank": i,
                "licence": texts[1] if len(texts) > 1 else None,
                "name": texts[2] if len(texts) > 2 else None,
                "club": texts[3] if len(texts) > 3 else None,
                "time_seconds": time_s,
            })

    return ranking
