import sys
if sys.platform == "win32":
    import asyncio
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import asyncio
import json
from curl_cffi.requests import AsyncSession

# Épreuves NCAA (yards, SCY)
SWIMCLOUD_EVENTS = {
    '50FR':   '1|50|1',
    '100FR':  '1|100|1',
    '200FR':  '1|200|1',
    '500FR':  '1|500|1',
    '1000FR': '1|1000|1',
    '1650FR': '1|1650|1',
    '50BA':   '2|50|1',
    '100BA':  '2|100|1',
    '200BA':  '2|200|1',
    '50BR':   '3|50|1',
    '100BR':  '3|100|1',
    '200BR':  '3|200|1',
    '50FL':   '4|50|1',
    '100FL':  '4|100|1',
    '200FL':  '4|200|1',
    '100IM':  '5|100|1',
    '200IM':  '5|200|1',
    '400IM':  '5|400|1',
}

# Épreuves USports (mètres, LCM) — différentes des yards NCAA
USPORTS_EVENTS = {
    '50FR':   '1|50|1',
    '100FR':  '1|100|1',
    '200FR':  '1|200|1',
    '400FR':  '1|400|1',    # remplace 500FR
    '800FR':  '1|800|1',    # remplace 1000FR
    '1500FR': '1|1500|1',   # remplace 1650FR
    '50BA':   '2|50|1',
    '100BA':  '2|100|1',
    '200BA':  '2|200|1',
    '50BR':   '3|50|1',
    '100BR':  '3|100|1',
    '200BR':  '3|200|1',
    '50FL':   '4|50|1',
    '100FL':  '4|100|1',
    '200FL':  '4|200|1',
    '100IM':  '5|100|1',
    '200IM':  '5|200|1',
    '400IM':  '5|400|1',
}

STROKE_MAP = {'1': 'FR', '2': 'BA', '3': 'BR', '4': 'FL', '5': 'IM'}

DIVISIONS_NCAA = [
    'division_1',   # NCAA D1
    'division_2',   # NCAA D2
    'division_3',   # NCAA D3
    'division_4',   # NAIA
    'division_5',   # NJCAA
]

GENDERS = ['M', 'F']


def get_event_code(distance: int, stroke) -> str | None:
    s = STROKE_MAP.get(str(stroke))
    if not s:
        return None
    return f"{distance}{s}"


async def fetch_top_times(
    session,
    event_code: str,
    event_api_code: str,
    region: str,
    page: int,
    gender: str,
    eventcourse: str = 'Y'
) -> dict:
    url = "https://www.swimcloud.com/api/splashes/top_times/"
    params = {
        'dont_group': 'false',
        'event': event_api_code,
        'eventcourse': eventcourse,
        'gender': gender,
        'page': str(page),
        'region': region,
        'season_id': '29',
    }
    r = await session.get(url, params=params, timeout=15, headers={
        'Accept': 'application/json',
        'Referer': 'https://www.swimcloud.com/times/',
    })
    r.raise_for_status()
    return r.json()


def process_results(results, teams, swimmers, division, gender):
    """Extraire équipes et nageurs depuis les résultats API."""
    for splash in results:
        tid = splash['team_id']
        sid = splash['swimmer_id']

        if tid not in teams:
            teams[tid] = {
                'swimcloud_id': tid,
                'name': splash['team']['name'],
                'abbr': splash['team'].get('abbr', ''),
                'city': splash['team'].get('city', ''),
                'state': splash['team'].get('state', ''),
                'division': division,
            }

        if sid not in swimmers:
            sw = splash['swimmer']
            swimmers[sid] = {
                'swimcloud_id': sid,
                'name': sw.get('name', ''),
                'gradcollege': sw.get('gradcollege'),
                'dateofbirth': sw.get('dateofbirth', ''),
                'country': sw.get('country', ''),
                'team_swimcloud_id': tid,
                'gender': gender,
                'times': {},
            }

        ec = get_event_code(splash['eventdistance'], splash['eventstroke'])
        if ec and ec not in swimmers[sid]['times']:
            swimmers[sid]['times'][ec] = splash['eventtime']


async def scrape_division(session, division, events_map, eventcourse, sleep_time, teams, swimmers):
    """Scraper une division complète."""
    for gender in GENDERS:
        for event_code, api_code in events_map.items():
            page = 1
            while True:
                try:
                    data = await fetch_top_times(
                        session, event_code, api_code,
                        division, page, gender, eventcourse
                    )
                    results = data.get('results', [])
                    page_count = data.get('page_count', 1)

                    process_results(results, teams, swimmers, division, gender)

                    print(f"  {division} {gender} {event_code} p{page}/{page_count} → {len(results)}")

                    if page >= page_count:
                        break
                    page += 1
                    await asyncio.sleep(sleep_time)

                except Exception as e:
                    print(f"  ERREUR {division} {gender} {event_code} p{page}: {e}")
                    if '429' in str(e):
                        print(f"  Rate limit — pause 30s...")
                        await asyncio.sleep(30.0)
                    else:
                        await asyncio.sleep(5.0)
                    break


async def main():
    teams: dict = {}
    swimmers: dict = {}

    async with AsyncSession(impersonate="chrome120") as session:

        # ── NCAA + NAIA + NJCAA (yards, SCY) ────────────────────────────
        for division in DIVISIONS_NCAA:
            await scrape_division(
                session, division,
                events_map=SWIMCLOUD_EVENTS,
                eventcourse='Y',
                sleep_time=3.0,
                teams=teams, swimmers=swimmers
            )

        # ── USports Canada (mètres, LCM) ─────────────────────────────────
        # Sleep plus long pour éviter les 429 (petit nombre d'équipes)
        await scrape_division(
            session, 'division_10',
            events_map=USPORTS_EVENTS,
            eventcourse='L',
            sleep_time=8.0,
            teams=teams, swimmers=swimmers
        )

    with open('backend/worker/scraped_data.json', 'w') as f:
        json.dump({'teams': teams, 'swimmers': swimmers}, f)

    print(f"\nDonnées sauvegardées : {len(teams)} équipes, {len(swimmers)} nageurs")


if __name__ == "__main__":
    asyncio.run(main())