import sys
if sys.platform == "win32":
    import asyncio
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

"""
RISE.MATCH Data Worker
Tourne via GitHub Actions : cron '0 2 * * 1' (lundi 2h UTC)
Lance localement : DATABASE_URL=... python backend/worker/data_worker.py
"""
import asyncio
import os
from curl_cffi.requests import AsyncSession
import asyncpg
from datetime import datetime, timezone

DATABASE_URL = os.environ["DATABASE_URL"]

SWIMCLOUD_EVENTS = {
    '50FR':   '1|50|1',
    '100FR':  '1|100|1',
    '200FR':  '1|200|1',
    '500FR':  '1|500|1',
    '1000FR': '1|1000|1',
    '1650FR': '1|1650|1',
    '100BA':  '2|100|1',
    '200BA':  '2|200|1',
    '100BR':  '3|100|1',
    '200BR':  '3|200|1',
    '100FL':  '4|100|1',
    '200FL':  '4|200|1',
    '200IM':  '5|200|1',
    '400IM':  '5|400|1',
}

STROKE_MAP = {'1': 'FR', '2': 'BA', '3': 'BR', '4': 'FL', '5': 'IM'}

DIVISIONS = [
    'division_1',   # NCAA D1
    'division_2',   # NCAA D2
    'division_3',   # NCAA D3
    'division_4',   # NAIA
    'division_5',   # NJCAA
    'division_10',  # USports (Canada)
]

GENDERS = ['M', 'F']

CURRENT_YEAR = 2026

def get_event_code(distance: int, stroke) -> str | None:
    s = STROKE_MAP.get(str(stroke))
    if not s:
        return None
    return f"{distance}{s}"

def parse_time(t: str) -> float:
    t = t.strip()
    if ':' in t:
        parts = t.split(':')
        return int(parts[0]) * 60 + float(parts[1])
    return float(t)

def is_departing(gradcollege) -> bool:
    return gradcollege is not None and gradcollege <= CURRENT_YEAR

def get_study_year(gradcollege) -> int | None:
    if gradcollege is None:
        return None
    diff = gradcollege - CURRENT_YEAR
    if diff <= 0:  return 5
    if diff == 1:  return 4
    if diff == 2:  return 3
    if diff == 3:  return 2
    return 1

async def fetch_top_times(session, event_code: str, region: str, page: int, gender: str = 'M') -> dict:
    url = "https://www.swimcloud.com/api/splashes/top_times/"
    params = {
        'dont_group': 'false',
        'event': SWIMCLOUD_EVENTS[event_code],
        'eventcourse': 'Y',
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

async def create_tables(conn):
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS sc_teams (
            id SERIAL PRIMARY KEY,
            swimcloud_id INTEGER UNIQUE NOT NULL,
            name TEXT NOT NULL,
            abbr TEXT,
            city TEXT,
            state TEXT,
            division TEXT,
            updated_at TIMESTAMPTZ DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS sc_swimmers (
            id SERIAL PRIMARY KEY,
            swimcloud_id INTEGER UNIQUE NOT NULL,
            name TEXT NOT NULL,
            gradcollege INTEGER,
            dateofbirth TEXT,
            country TEXT,
            team_swimcloud_id INTEGER,
            study_year INTEGER,
            is_departing BOOLEAN DEFAULT false,
            gender TEXT DEFAULT 'M',
            updated_at TIMESTAMPTZ DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS sc_times (
            id SERIAL PRIMARY KEY,
            swimmer_swimcloud_id INTEGER NOT NULL,
            event_code TEXT NOT NULL,
            time_display TEXT NOT NULL,
            time_seconds FLOAT NOT NULL,
            season_id INTEGER DEFAULT 29,
            updated_at TIMESTAMPTZ DEFAULT now(),
            UNIQUE(swimmer_swimcloud_id, event_code, season_id)
        );

        CREATE TABLE IF NOT EXISTS data_freshness (
            source TEXT PRIMARY KEY,
            last_updated TIMESTAMPTZ,
            records_updated INTEGER,
            status TEXT DEFAULT 'never'
        );
    """)

async def main():
    print(f"Worker démarré — {datetime.now(timezone.utc).isoformat()}")

    teams: dict = {}
    swimmers: dict = {}

    # ÉTAPE 1 : Scraping (curl_cffi seul, pas de DB)
    async with AsyncSession(impersonate="chrome120") as session:
        for division in DIVISIONS:
            for gender in GENDERS:
                for event_code in SWIMCLOUD_EVENTS.keys():
                    page = 1
                    while True:
                        try:
                            data = await fetch_top_times(session, event_code, division, page, gender)
                            results = data.get('results', [])
                            page_count = data.get('page_count', 1)

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

                            print(f"  {division} {gender} {event_code} p{page}/{page_count} → {len(results)}")

                            if page >= page_count:
                                break
                            page += 1
                            await asyncio.sleep(3.0)  # plus respectueux → évite les 429

                        except Exception as e:
                            print(f"  ERREUR {division} {gender} {event_code} p{page}: {e}")
                            await asyncio.sleep(5.0)  # pause en cas d'erreur
                            break

    # curl_cffi est maintenant fermé
    print(f"\nAgrégation : {len(teams)} équipes, {len(swimmers)} nageurs")

    # ÉTAPE 2 : Insertion en DB (asyncpg seul, curl_cffi fermé)
    conn = await asyncpg.connect(DATABASE_URL)
    await create_tables(conn)

    print("Insertion des équipes...")
    for team in teams.values():
        await conn.execute("""
            INSERT INTO sc_teams (swimcloud_id, name, abbr, city, state, division, updated_at)
            VALUES ($1,$2,$3,$4,$5,$6,now())
            ON CONFLICT (swimcloud_id) DO UPDATE
            SET name=$2, abbr=$3, city=$4, state=$5, division=$6, updated_at=now()
        """, team['swimcloud_id'], team['name'], team['abbr'],
             team['city'], team['state'], team['division'])

    print("Insertion des nageurs et temps...")
    for sw in swimmers.values():
        gc = sw['gradcollege']
        await conn.execute("""
            INSERT INTO sc_swimmers (swimcloud_id, name, gradcollege, dateofbirth, country,
                                     team_swimcloud_id, study_year, is_departing, gender, updated_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,now())
            ON CONFLICT (swimcloud_id) DO UPDATE
            SET name=$2, gradcollege=$3, dateofbirth=$4, country=$5,
                team_swimcloud_id=$6, study_year=$7, is_departing=$8, gender=$9, updated_at=now()
        """, sw['swimcloud_id'], sw['name'], gc, sw['dateofbirth'],
             sw['country'], sw['team_swimcloud_id'],
             get_study_year(gc), is_departing(gc), sw['gender'])

        for event_code, time_str in sw['times'].items():
            try:
                ts = parse_time(time_str)
                await conn.execute("""
                    INSERT INTO sc_times (swimmer_swimcloud_id, event_code, time_display, time_seconds, season_id, updated_at)
                    VALUES ($1,$2,$3,$4,29,now())
                    ON CONFLICT (swimmer_swimcloud_id, event_code, season_id) DO UPDATE
                    SET time_display=$3, time_seconds=$4, updated_at=now()
                """, sw['swimcloud_id'], event_code, time_str, ts)
            except Exception as e:
                print(f"  Temps invalide {sw['name']} {event_code} '{time_str}': {e}")

    await conn.execute("""
        INSERT INTO data_freshness (source, last_updated, records_updated, status)
        VALUES ('swimcloud', $1, $2, 'ok')
        ON CONFLICT (source) DO UPDATE
        SET last_updated=$1, records_updated=$2, status='ok'
    """, datetime.now(timezone.utc), len(swimmers))

    await conn.close()
    print("Worker terminé.")

if __name__ == "__main__":
    asyncio.run(main())