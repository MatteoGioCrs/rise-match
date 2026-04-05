"""
FFN Extranat scraper — rewritten from confirmed HTML structure (2025).

URL: https://ffn.extranat.fr/webffn/nat_recherche.php?idact=nat&idrch_id={licence}&idbas=50

Page structure:
  Multiple <table class="w-full text-sm text-left text-gray-500"> tables.
  Each has a <thead> with:
    <p>Meilleures Performances Personnelles (MPP)</p>
    <p class="text-sm font-medium">Bassin : 50 metres</p>  (or 25 metres)
  Each <tr class="border-b ..."> in <tbody> is one performance.
  Column layout:
    th[scope="row"] = event ("50 NL", "100 BR", etc.)
    td[0] = time  ("00:23.26" or "01:02.41")
    td[1] = age   ("(16 ans)")
    td[2] = FINA points ("1226 pts")
    td[3] = location div with <p>ANGERS</p><p>(FRA)</p>
    td[4] = date  ("12/12/2025")
    td[5] = comp type ("[NAT]", "[REG]", etc.)
    td[6] = (empty)
    td[7] = club  ("PAYS D'AIX NATATION")
"""

import httpx
from bs4 import BeautifulSoup
from datetime import datetime

BASE_URL = "https://ffn.extranat.fr/webffn/nat_recherche.php"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    "Accept-Language": "fr-FR,fr;q=0.9",
}

EVENT_MAP: dict[str, str] = {
    "50 NL": "50FR",   "100 NL": "100FR",  "200 NL": "200FR",
    "400 NL": "400FR", "800 NL": "800FR",  "1500 NL": "1500FR",
    "50 BR": "50BR",   "100 BR": "100BR",  "200 BR": "200BR",
    "50 DO": "50BA",   "100 DO": "100BA",  "200 DO": "200BA",
    "50 PA": "50FL",   "100 PA": "100FL",  "200 PA": "200FL",
    "100 4N": "100IM", "200 4N": "200IM",  "400 4N": "400IM",
}


def _parse_time(time_str: str) -> float | None:
    """'00:23.26' → 23.26,  '01:02.41' → 62.41,  '15:03.85' → 903.85"""
    try:
        time_str = time_str.strip()
        if ":" in time_str:
            parts = time_str.split(":")
            if len(parts) == 3:
                return int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2])
            return int(parts[0]) * 60 + float(parts[1])
        return float(time_str)
    except Exception:
        return None


def _parse_date(date_str: str) -> str:
    """'12/12/2025' → '2025-12-12'"""
    try:
        return datetime.strptime(date_str.strip(), "%d/%m/%Y").strftime("%Y-%m-%d")
    except Exception:
        return date_str.strip()


def _parse_tables(html: str) -> list[dict]:
    """Parse all MPP performance tables from Extranat HTML."""
    soup = BeautifulSoup(html, "html.parser")
    performances: list[dict] = []

    for table in soup.find_all("table", class_=lambda c: c and "w-full" in c):
        thead = table.find("thead")
        if not thead:
            continue

        header_text = thead.get_text()
        if "50 m" in header_text.lower() or "50m" in header_text.lower():
            basin = "LCM"
        elif "25 m" in header_text.lower() or "25m" in header_text.lower():
            basin = "SCM"
        else:
            continue  # not an MPP table

        tbody = table.find("tbody")
        if not tbody:
            continue

        for row in tbody.find_all("tr"):
            try:
                th = row.find("th", {"scope": "row"})
                if not th:
                    continue
                event_ffn = th.get_text(strip=True)
                event_code = EVENT_MAP.get(event_ffn)
                if not event_code:
                    continue

                tds = row.find_all("td")
                if len(tds) < 5:
                    continue

                time_s = _parse_time(tds[0].get_text(strip=True))
                if not time_s:
                    continue

                pts_text = tds[2].get_text(strip=True).replace("pts", "").strip()
                fina_points = int(pts_text) if pts_text.isdigit() else 0

                lieu_ps = tds[3].find_all("p")
                lieu = lieu_ps[0].get_text(strip=True) if lieu_ps else tds[3].get_text(strip=True)

                perf_date = _parse_date(tds[4].get_text(strip=True))
                comp_type = tds[5].get_text(strip=True).strip("[]")
                club = tds[7].get_text(strip=True) if len(tds) > 7 else ""

                performances.append({
                    "event":        event_code,
                    "basin":        basin,
                    "time_seconds": time_s,
                    "time_display": tds[0].get_text(strip=True),
                    "fina_points":  fina_points,
                    "lieu":         lieu,
                    "date":         perf_date,
                    "comp_type":    comp_type,
                    "club":         club,
                })
            except Exception:
                continue

    return performances


async def fetch_swimmer_perfs(licence: str, basin: str = "LCM") -> list[dict]:
    """
    Fetch all performances for a licence number from FFN Extranat.

    basin:
      'LCM'  → idbas=50 only
      'SCM'  → idbas=25 only
      'ALL'  → both requests merged
    """
    if basin == "ALL":
        basins_to_fetch = [("LCM", "50"), ("SCM", "25")]
    elif basin == "SCM":
        basins_to_fetch = [("SCM", "25")]
    else:
        basins_to_fetch = [("LCM", "50")]

    results: list[dict] = []

    async with httpx.AsyncClient(headers=HEADERS, timeout=15) as client:
        for basin_label, idbas in basins_to_fetch:
            url = f"{BASE_URL}?idact=nat&idrch_id={licence}&idbas={idbas}"
            try:
                r = await client.get(url)
                r.raise_for_status()
                html = r.content.decode("utf-8", errors="replace")
                perfs = _parse_tables(html)
                results.extend(perfs)
                print(f"[FFN] licence={licence} {basin_label}: {len(perfs)} performances")
            except Exception as e:
                print(f"[FFN] fetch failed ({basin_label}): {e}")

    return results


async def search_swimmer(_nom: str, _prenom: str = "") -> list[dict]:
    """
    Stub — swimmer search by name not yet implemented for post-cyberattack Extranat.
    Users provide their licence number directly.
    """
    return []
