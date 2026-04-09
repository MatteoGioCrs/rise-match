import asyncio
import asyncpg
import aiohttp
import os
import difflib
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(message)s')
log = logging.getLogger(__name__)

SCORECARD_API_KEY = "mEMoGRSPJLJmxqZVTgkBKbcKMuKFJSMM"
SCORECARD_BASE = "https://api.data.gov/ed/collegescorecard/v1/schools.json"

FIELDS = ",".join([
    "id",
    "school.name",
    "school.state",
    "school.city",
    "admissions.admission_rate.overall",
    "cost.tuition.out_of_state",
    "student.size",
    "earnings.10_yrs_after_entry.median",
    "completion.rate_suppressed.overall"
])

async def search_scorecard(session, school_name, state):
    """Cherche une école dans College Scorecard par nom et état."""
    params = {
        "key": SCORECARD_API_KEY,
        "school.state": state,
        "fields": FIELDS,
        "per_page": 10,
        "_search": school_name
    }
    try:
        async with session.get(SCORECARD_BASE, params=params, timeout=aiohttp.ClientTimeout(total=10)) as resp:
            if resp.status != 200:
                return None
            data = await resp.json()
            results = data.get("results", [])
            if not results:
                return None
            if len(results) == 1:
                return results[0]
            # Fuzzy match sur le nom
            best = max(results, key=lambda r: difflib.SequenceMatcher(
                None,
                school_name.lower(),
                r.get("school.name", "").lower()
            ).ratio())
            score = difflib.SequenceMatcher(
                None,
                school_name.lower(),
                best.get("school.name", "").lower()
            ).ratio()
            return best if score > 0.6 else None
    except Exception as e:
        log.warning(f"Erreur API pour {school_name}: {e}")
        return None

async def main():
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        from dotenv import load_dotenv
        load_dotenv()
        db_url = os.environ.get("DATABASE_URL")

    conn = await asyncpg.connect(db_url)

    # Créer la table
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS school_data (
            swimcloud_id INTEGER PRIMARY KEY,
            scorecard_id INTEGER,
            admission_rate FLOAT,
            tuition_out_state INTEGER,
            enrollment_total INTEGER,
            median_earnings INTEGER,
            completion_rate FLOAT,
            scorecard_name TEXT,
            updated_at TIMESTAMP DEFAULT NOW()
        )
    """)
    log.info("Table school_data créée/vérifiée")

    # Récupérer les équipes US seulement (pas USports)
    teams = await conn.fetch("""
        SELECT swimcloud_id, name, state, city
        FROM sc_teams
        WHERE division != 'division_10'
        AND state IS NOT NULL
        ORDER BY swimcloud_id
    """)
    log.info(f"{len(teams)} équipes à traiter")

    matched = 0
    not_found = 0

    async with aiohttp.ClientSession() as session:
        for i, team in enumerate(teams):
            # Skip si déjà dans la table
            existing = await conn.fetchval(
                "SELECT scorecard_id FROM school_data WHERE swimcloud_id = $1",
                team["swimcloud_id"]
            )
            if existing:
                continue

            result = await search_scorecard(session, team["name"], team["state"])

            if result:
                await conn.execute("""
                    INSERT INTO school_data
                    (swimcloud_id, scorecard_id, admission_rate, tuition_out_state,
                     enrollment_total, median_earnings, completion_rate, scorecard_name)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (swimcloud_id) DO UPDATE SET
                        scorecard_id = EXCLUDED.scorecard_id,
                        admission_rate = EXCLUDED.admission_rate,
                        tuition_out_state = EXCLUDED.tuition_out_state,
                        enrollment_total = EXCLUDED.enrollment_total,
                        median_earnings = EXCLUDED.median_earnings,
                        completion_rate = EXCLUDED.completion_rate,
                        scorecard_name = EXCLUDED.scorecard_name,
                        updated_at = NOW()
                """,
                    team["swimcloud_id"],
                    result.get("id"),
                    result.get("admissions.admission_rate.overall"),
                    result.get("cost.tuition.out_of_state"),
                    result.get("student.size"),
                    result.get("earnings.10_yrs_after_entry.median"),
                    result.get("completion.rate_suppressed.overall"),
                    result.get("school.name")
                )
                matched += 1
                log.info(f"[{i+1}/{len(teams)}] ✅ {team['name']} → {result.get('school.name')}")
            else:
                not_found += 1
                log.info(f"[{i+1}/{len(teams)}] ❌ Non trouvé: {team['name']} ({team['state']})")

            # Rate limiting : 1 requête par seconde
            await asyncio.sleep(1)

    await conn.close()
    log.info(f"Terminé : {matched} matchés, {not_found} non trouvés")

if __name__ == "__main__":
    asyncio.run(main())
