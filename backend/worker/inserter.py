import sys
if sys.platform == "win32":
    import asyncio
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import asyncio
import json
import os
from datetime import datetime, timezone
import asyncpg

DATABASE_URL = os.environ["DATABASE_URL"]

CURRENT_YEAR = 2026


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
    if diff <= 0:  return 5   # GR
    if diff == 1:  return 4   # SR
    if diff == 2:  return 3   # JR
    if diff == 3:  return 2   # SO
    return 1                   # FR


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
    with open('backend/worker/scraped_data.json') as f:
        data = json.load(f)

    teams = data['teams']
    swimmers = data['swimmers']
    print(f"Chargé : {len(teams)} équipes, {len(swimmers)} nageurs")

    conn = await asyncpg.connect(DATABASE_URL)
    await create_tables(conn)

    # ── Équipes (batch) ──────────────────────────────────────────────────
    print("Insertion équipes...")
    teams_data = [
        (
            t['swimcloud_id'], t['name'], t.get('abbr', ''),
            t.get('city', ''), t.get('state', ''), t['division']
        )
        for t in teams.values()
    ]
    await conn.executemany("""
        INSERT INTO sc_teams (swimcloud_id, name, abbr, city, state, division, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, now())
        ON CONFLICT (swimcloud_id) DO UPDATE
        SET name=$2, abbr=$3, city=$4, state=$5, division=$6, updated_at=now()
    """, teams_data)
    print(f"  {len(teams_data)} équipes insérées.")

    # ── Nageurs (batch) ──────────────────────────────────────────────────
    print("Insertion nageurs...")
    swimmers_data = [
        (
            sw['swimcloud_id'], sw['name'], sw.get('gradcollege'),
            sw.get('dateofbirth', ''), sw.get('country', ''),
            sw['team_swimcloud_id'],
            get_study_year(sw.get('gradcollege')),
            is_departing(sw.get('gradcollege')),
            sw.get('gender', 'M')
        )
        for sw in swimmers.values()
    ]
    await conn.executemany("""
        INSERT INTO sc_swimmers (
            swimcloud_id, name, gradcollege, dateofbirth, country,
            team_swimcloud_id, study_year, is_departing, gender, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
        ON CONFLICT (swimcloud_id) DO UPDATE
        SET name=$2, gradcollege=$3, dateofbirth=$4, country=$5,
            team_swimcloud_id=$6, study_year=$7, is_departing=$8, gender=$9, updated_at=now()
    """, swimmers_data)
    print(f"  {len(swimmers_data)} nageurs insérés.")

    # ── Temps (batch) ────────────────────────────────────────────────────
    print("Insertion temps...")
    times_data = []
    skipped = 0
    for sw in swimmers.values():
        for event_code, time_str in sw.get('times', {}).items():
            try:
                ts = parse_time(time_str)
                times_data.append((sw['swimcloud_id'], event_code, time_str, ts))
            except Exception:
                skipped += 1

    await conn.executemany("""
        INSERT INTO sc_times (
            swimmer_swimcloud_id, event_code, time_display, time_seconds, season_id, updated_at
        )
        VALUES ($1, $2, $3, $4, 29, now())
        ON CONFLICT (swimmer_swimcloud_id, event_code, season_id) DO UPDATE
        SET time_display=$3, time_seconds=$4, updated_at=now()
    """, times_data)
    print(f"  {len(times_data)} temps insérés ({skipped} ignorés).")

    # ── Freshness ────────────────────────────────────────────────────────
    await conn.execute("""
        INSERT INTO data_freshness (source, last_updated, records_updated, status)
        VALUES ('swimcloud', $1, $2, 'ok')
        ON CONFLICT (source) DO UPDATE
        SET last_updated=$1, records_updated=$2, status='ok'
    """, datetime.now(timezone.utc), len(swimmers))

    await conn.close()
    print("Insertion terminée.")


if __name__ == "__main__":
    asyncio.run(main())