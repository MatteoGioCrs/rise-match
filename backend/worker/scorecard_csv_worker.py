import asyncio
import asyncpg
import csv
import os
import difflib
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(message)s')
log = logging.getLogger(__name__)

CSV_PATH = os.path.join(os.path.dirname(__file__), 'Most-Recent-Cohorts-Institution.csv')

def load_scorecard_by_state(csv_path):
    """Charge le CSV et groupe les écoles par état."""
    by_state = {}
    with open(csv_path, encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            state = row.get('STABBR', '')
            if not state:
                continue
            if state not in by_state:
                by_state[state] = []
            by_state[state].append(row)
    return by_state

def safe_float(val):
    try:
        return float(val)
    except:
        return None

def safe_int(val):
    try:
        return int(float(val))
    except:
        return None

MANUAL_OVERRIDES = {
    # swimcloud_name: scorecard_name_exact
    'Georgia Institute of Technology': 'Georgia Institute of Technology',
    'Purdue University': 'Purdue University-Main Campus',
    'Louisiana State University': 'Louisiana State University and Agricultural & Mechanical College',
    'Ohio State University': 'Ohio State University-Main Campus',
    'Colorado State University': 'Colorado State University-Fort Collins',
    'Columbia University': 'Columbia University in the City of New York',
    'Virginia Tech': 'Virginia Polytechnic Institute and State University',
    'UCLA': 'University of California-Los Angeles',
    'University of Minnesota': 'University of Minnesota-Twin Cities',
    'University of Illinois': 'University of Illinois Urbana-Champaign',
    'University of Texas': 'The University of Texas at Austin',
    'University of Michigan': 'University of Michigan-Ann Arbor',
    'University of Hawaii': 'University of Hawaii at Manoa',
    'Rutgers University': 'Rutgers University-New Brunswick',
    'Fresno State': 'California State University-Fresno',
    'UMBC': 'University of Maryland Baltimore County',
    'University of South Carolina': 'University of South Carolina-Columbia',
    'University of Tennessee': 'University of Tennessee-Knoxville',
    'Arizona State University': 'Arizona State University Campus Immersion',
    'Bowling Green State University': 'Bowling Green State University-Main Campus',
    'University of Pittsburgh': 'University of Pittsburgh-Pittsburgh Campus',
    'University of Cincinnati': 'University of Cincinnati-Main Campus',
}

def find_best_match(school_name, candidates):
    """Trouve la meilleure correspondance de nom parmi les candidats."""
    best_score = 0
    best_candidate = None
    name_lower = school_name.lower()

    for c in candidates:
        candidate_name = c.get('INSTNM', '').lower()
        score = difflib.SequenceMatcher(None, name_lower, candidate_name).ratio()
        if score > best_score:
            best_score = score
            best_candidate = c

    return best_candidate, best_score

CONTROL_MAP = {'1': 'public', '2': 'private', '3': 'for-profit'}

PREDDEG_MAP = {
    '0': 'Non classifié',
    '1': 'Certificat',
    '2': 'Associate',
    '3': 'Bachelor',
    '4': 'Graduate',
}

def build_insert_params(swimcloud_id, best, score):
    return (
        swimcloud_id,
        safe_int(best.get('UNITID')),
        safe_float(best.get('ADM_RATE')),
        safe_int(best.get('TUITIONFEE_OUT')),
        safe_int(best.get('UGDS')),
        safe_int(best.get('MD_EARN_WNE_P10')),
        CONTROL_MAP.get(best.get('CONTROL', ''), 'unknown'),
        best.get('INSTNM'),
        score,
        safe_float(best.get('RET_FT4')),
        safe_float(best.get('PCTPELL')),
        safe_int(best.get('GRAD_DEBT_MDN')),
        safe_float(best.get('LATITUDE')),
        safe_float(best.get('LONGITUDE')),
        best.get('INSTURL', '').strip() or None,
    )

INSERT_SQL = """
    INSERT INTO school_data
    (swimcloud_id, scorecard_id, admission_rate, tuition_out_state,
     enrollment_total, median_earnings, school_type, scorecard_name, match_score,
     retention_rate, pct_pell_grant, grad_debt_median, latitude, longitude, website)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    ON CONFLICT (swimcloud_id) DO UPDATE SET
        scorecard_id = EXCLUDED.scorecard_id,
        admission_rate = EXCLUDED.admission_rate,
        tuition_out_state = EXCLUDED.tuition_out_state,
        enrollment_total = EXCLUDED.enrollment_total,
        median_earnings = EXCLUDED.median_earnings,
        school_type = EXCLUDED.school_type,
        scorecard_name = EXCLUDED.scorecard_name,
        match_score = EXCLUDED.match_score,
        retention_rate = EXCLUDED.retention_rate,
        pct_pell_grant = EXCLUDED.pct_pell_grant,
        grad_debt_median = EXCLUDED.grad_debt_median,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        website = EXCLUDED.website,
        updated_at = NOW()
"""

async def main():
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        from dotenv import load_dotenv
        load_dotenv()
        db_url = os.environ.get("DATABASE_URL")

    log.info("Chargement du CSV Scorecard...")
    by_state = load_scorecard_by_state(CSV_PATH)
    log.info(f"CSV chargé : {sum(len(v) for v in by_state.values())} écoles dans {len(by_state)} états")

    conn = await asyncpg.connect(db_url)

    await conn.execute("""
        CREATE TABLE IF NOT EXISTS school_data (
            swimcloud_id INTEGER PRIMARY KEY,
            scorecard_id INTEGER,
            admission_rate FLOAT,
            tuition_out_state INTEGER,
            enrollment_total INTEGER,
            median_earnings INTEGER,
            school_type TEXT,
            scorecard_name TEXT,
            match_score FLOAT,
            retention_rate FLOAT,
            pct_pell_grant FLOAT,
            grad_debt_median INTEGER,
            latitude FLOAT,
            longitude FLOAT,
            website TEXT,
            updated_at TIMESTAMP DEFAULT NOW()
        )
    """)

    # Ajouter les colonnes si la table existait déjà sans elles
    await conn.execute('ALTER TABLE school_data ADD COLUMN IF NOT EXISTS retention_rate FLOAT')
    await conn.execute('ALTER TABLE school_data ADD COLUMN IF NOT EXISTS pct_pell_grant FLOAT')
    await conn.execute('ALTER TABLE school_data ADD COLUMN IF NOT EXISTS grad_debt_median INTEGER')
    await conn.execute('ALTER TABLE school_data ADD COLUMN IF NOT EXISTS latitude FLOAT')
    await conn.execute('ALTER TABLE school_data ADD COLUMN IF NOT EXISTS longitude FLOAT')
    await conn.execute('ALTER TABLE school_data ADD COLUMN IF NOT EXISTS website TEXT')

    teams = await conn.fetch("""
        SELECT swimcloud_id, name, state, city
        FROM sc_teams
        WHERE division != 'division_10'
        AND state IS NOT NULL
        ORDER BY swimcloud_id
    """)
    log.info(f"{len(teams)} équipes à traiter")

    matched = 0
    uncertain = 0
    not_found = 0

    all_schools = [s for schools in by_state.values() for s in schools]

    for i, team in enumerate(teams):
        team_name = team['name']

        # Vérifier les overrides manuels d'abord
        if team_name in MANUAL_OVERRIDES:
            target_name = MANUAL_OVERRIDES[team_name]
            best = next((s for s in all_schools if s.get('INSTNM') == target_name), None)
            if best:
                score = 1.0
                log.info(f"[{i+1}/{len(teams)}] 🔧 {team_name} → {best.get('INSTNM')} (override)")
                matched += 1
                await conn.execute(INSERT_SQL, *build_insert_params(team['swimcloud_id'], best, score))
                continue

        state = team['state']
        candidates = by_state.get(state, [])

        if not candidates:
            log.info(f"[{i+1}/{len(teams)}] ❌ Aucune école dans l'état {state} pour {team_name}")
            not_found += 1
            continue

        best, score = find_best_match(team_name, candidates)

        if score < 0.6:
            log.info(f"[{i+1}/{len(teams)}] ❌ Non trouvé: {team_name} (meilleur: {best.get('INSTNM')} @ {score:.2f})")
            not_found += 1
            continue

        label = "✅" if score >= 0.75 else "⚠️"
        if score < 0.75:
            uncertain += 1
        else:
            matched += 1

        log.info(f"[{i+1}/{len(teams)}] {label} {team_name} → {best.get('INSTNM')} ({score:.2f})")

        await conn.execute(INSERT_SQL, *build_insert_params(team['swimcloud_id'], best, score))

    await conn.close()
    log.info(f"Terminé : {matched} matchés ✅, {uncertain} incertains ⚠️, {not_found} non trouvés ❌")

if __name__ == "__main__":
    asyncio.run(main())
