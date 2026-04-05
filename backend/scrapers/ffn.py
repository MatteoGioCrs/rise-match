"""
FFN Extranat scraper — based on confirmed HTML structure (2025).

URL: https://ffn.extranat.fr/webffn/nat_recherche.php?idact=nat&idrch_id={licence}&idbas={50|25}
  idbas=50 → LCM (50 mètres)
  idbas=25 → SCM (25 mètres)

Table structure:
  <table class="w-full text-sm text-left text-gray-500">
    <thead>
      <p>Meilleures Performances Personnelles (MPP)</p>
      <p class="text-sm font-medium">Bassin : 50 mètres</p>
    </thead>
    <tbody>
      <tr class="border-b ...">
        <th scope="row">50 NL</th>
        <td>00:23.26</td>   ← td[0] time
        <td>(16 ans)</td>   ← td[1] age
        <td>1226 pts</td>   ← td[2] FINA points
        <td>div>p[ANGERS]   ← td[3] location
            >p[(FRA)]</td>
        <td>12/12/2025</td> ← td[4] date
        <td>[NAT]</td>      ← td[5] comp type
        <td></td>           ← td[6] empty
        <td>PAYS D'AIX NATATION</td> ← td[7] club
"""

import httpx
from bs4 import BeautifulSoup
from datetime import datetime

BASE_URL = "https://ffn.extranat.fr/webffn/nat_recherche.php"

_HEADERS = {
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


def _parse_time(s: str) -> float | None:
    try:
        s = s.strip()
        parts = s.split(":")
        if len(parts) == 3:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2])
        if len(parts) == 2:
            return int(parts[0]) * 60 + float(parts[1])
        return float(s)
    except Exception:
        return None


def _parse_date(s: str) -> str:
    try:
        return datetime.strptime(s.strip(), "%d/%m/%Y").strftime("%Y-%m-%d")
    except Exception:
        return s.strip()


def _parse_html(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    results: list[dict] = []

    # No class filter — match any table whose thead mentions performances
    for table in soup.find_all("table"):
        thead = table.find("thead")
        if not thead:
            continue
        header = thead.get_text(separator=" ")
        if "MPP" not in header and "Meilleures" not in header and "Performances" not in header:
            continue

        # Basin: look for "50" near "mètre/metre/tres" in the header
        if "50" in header and ("tres" in header or "mètre" in header or "metre" in header):
            basin = "LCM"
        else:
            basin = "SCM"

        tbody = table.find("tbody")
        if not tbody:
            continue

        for row in tbody.find_all("tr"):
            try:
                th = row.find("th", {"scope": "row"})
                if not th:
                    continue
                event_code = EVENT_MAP.get(th.get_text(strip=True))
                if not event_code:
                    continue

                tds = row.find_all("td")
                if len(tds) < 5:
                    continue

                time_s = _parse_time(tds[0].get_text(strip=True))
                if not time_s:
                    continue

                pts_raw = tds[2].get_text(strip=True).replace("pts", "").strip()
                fina_pts = int(pts_raw) if pts_raw.isdigit() else 0

                lieu_div = tds[3].find("div")
                if lieu_div:
                    ps = lieu_div.find_all("p")
                    lieu = ps[0].get_text(strip=True) if ps else ""
                else:
                    lieu = tds[3].get_text(strip=True)

                perf_date = _parse_date(tds[4].get_text(strip=True))
                comp_type = tds[5].get_text(strip=True).strip("[]")
                club = tds[7].get_text(strip=True) if len(tds) > 7 else ""

                results.append({
                    "event":        event_code,
                    "basin":        basin,
                    "time_seconds": time_s,
                    "time_display": tds[0].get_text(strip=True),
                    "fina_points":  fina_pts,
                    "lieu":         lieu,
                    "date":         perf_date,
                    "comp_type":    comp_type,
                    "club":         club,
                })
            except Exception:
                continue

    return results


async def fetch_perfs(licence: str) -> dict:
    """
    Fetch all LCM + SCM performances for a FFN licence number.
    Also extracts the swimmer name from the page.
    """
    all_perfs: list[dict] = []
    swimmer_name = None

    async with httpx.AsyncClient(headers=_HEADERS, timeout=15) as client:
        for basin_label, idbas in [("LCM", "50"), ("SCM", "25")]:
            url = f"{BASE_URL}?idact=nat&idrch_id={licence}&idbas={idbas}"
            try:
                r = await client.get(url)
                r.raise_for_status()
                html = r.content.decode("utf-8", errors="replace")

                if swimmer_name is None:
                    soup = BeautifulSoup(html, "html.parser")
                    # Name format: "DENISOT Gabin (2009) FRA [2584377]"
                    for tag in soup.find_all(["h5", "h4", "h3", "p"]):
                        text = tag.get_text(strip=True)
                        if f"[{licence}]" in text:
                            swimmer_name = text.split("FRA")[0].strip().rstrip()
                            break

                perfs = _parse_html(html)
                all_perfs.extend(perfs)
                print(f"[FFN] {licence} {basin_label}: {len(perfs)} performances")

            except Exception as e:
                print(f"[FFN] fetch error ({basin_label}): {e}")

    return {
        "licence":      licence,
        "swimmer_name": swimmer_name,
        "count":        len(all_perfs),
        "performances": all_perfs,
    }
