import asyncio
import asyncpg
import csv
import os
import difflib
import logging

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
        return 0.0

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
    'Florida Tech': 'Florida Institute of Technology',
    'Tulane University': 'Tulane University of Louisiana',
    'Catholic University': 'The Catholic University of America',
    'Washington University (Missouri)': 'Washington University in St Louis',
    'Wheaton College (Illinois)': 'Wheaton College',
    'Stevens Institute': 'Stevens Institute of Technology',
    'Trinity College (Connecticut)': 'Trinity College',
    'U.S. Military Academy (Army)': 'United States Military Academy',
    'U.S. Naval Academy (Navy)': 'United States Naval Academy',
    'Union College (New York)': 'Union College',
    'Kutztown University': 'Kutztown University of Pennsylvania',
    'York College (NY)': 'CUNY York College',
    'Centenary College': 'Centenary University',
    'Lindsey Wilson University': 'Lindsey Wilson College',
    'John Jay College': 'John Jay College of Criminal Justice',
    "Saint Joseph's University (Long Island)": "Saint Joseph's University",
    'PennWest Edinboro University': 'Pennsylvania Western University',
    'Claremont McKenna-Harvey Mudd-Scripps Colleges': 'Claremont McKenna College',
    'Pennsylvania Western-California': 'Pennsylvania Western University',
    # Simon Fraser est canadienne — pas dans le CSV US, laissé comme ❌
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

PCIP_FAMILIES = {
    'has_engineering':     ['PCIP14', 'PCIP15', 'PCIP11', 'PCIP41'],
    'has_business':        ['PCIP52'],
    'has_sciences':        ['PCIP26', 'PCIP40', 'PCIP51', 'PCIP27'],
    'has_humanities':      ['PCIP23', 'PCIP16', 'PCIP38', 'PCIP54', 'PCIP05'],
    'has_arts':            ['PCIP50', 'PCIP04'],
    'has_social_sciences': ['PCIP45', 'PCIP42', 'PCIP44', 'PCIP09'],
    'has_sports_kine':     ['PCIP31'],
    'has_education':       ['PCIP13'],
    'has_law':             ['PCIP22'],
    'has_environment':     ['PCIP03', 'PCIP01'],
}

PCIP_LABELS = {
    'PCIP11': 'Informatique',
    'PCIP14': 'Ingénierie',
    'PCIP26': 'Biologie',
    'PCIP27': 'Mathématiques',
    'PCIP40': 'Sciences physiques',
    'PCIP42': 'Psychologie',
    'PCIP45': 'Sciences sociales',
    'PCIP51': 'Santé / Médecine',
    'PCIP52': 'Business',
    'PCIP50': 'Arts',
    'PCIP13': 'Éducation',
    'PCIP23': 'Lettres',
    'PCIP22': 'Droit',
    'PCIP31': 'Sport / Kiné',
    'PCIP03': 'Environnement',
}

def get_program_flags(row):
    flags = {}
    for family, codes in PCIP_FAMILIES.items():
        flags[family] = any(
            safe_float(row.get(code, '0') or '0') > 0.03
            for code in codes
        )

    all_pcip = {}
    for code, label in PCIP_LABELS.items():
        val = safe_float(row.get(code, '0') or '0')
        if val and val > 0.02:
            all_pcip[label] = val

    top5 = sorted(all_pcip.items(), key=lambda x: x[1], reverse=True)[:5]
    top_programs = ', '.join([label for label, _ in top5]) or None

    return flags, top_programs

def build_insert_params(swimcloud_id, best, score):
    flags, top_programs = get_program_flags(best)
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
        flags['has_engineering'],
        flags['has_business'],
        flags['has_sciences'],
        flags['has_humanities'],
        flags['has_arts'],
        flags['has_social_sciences'],
        flags['has_sports_kine'],
        flags['has_education'],
        flags['has_law'],
        flags['has_environment'],
        top_programs,
    )

INSERT_SQL = """
    INSERT INTO school_data
    (swimcloud_id, scorecard_id, admission_rate, tuition_out_state,
     enrollment_total, median_earnings, school_type, scorecard_name, match_score,
     retention_rate, pct_pell_grant, grad_debt_median, latitude, longitude, website,
     has_engineering, has_business, has_sciences, has_humanities, has_arts,
     has_social_sciences, has_sports_kine, has_education, has_law, has_environment,
     top_programs)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
            $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
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
        has_engineering = EXCLUDED.has_engineering,
        has_business = EXCLUDED.has_business,
        has_sciences = EXCLUDED.has_sciences,
        has_humanities = EXCLUDED.has_humanities,
        has_arts = EXCLUDED.has_arts,
        has_social_sciences = EXCLUDED.has_social_sciences,
        has_sports_kine = EXCLUDED.has_sports_kine,
        has_education = EXCLUDED.has_education,
        has_law = EXCLUDED.has_law,
        has_environment = EXCLUDED.has_environment,
        top_programs = EXCLUDED.top_programs,
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
            has_engineering BOOLEAN DEFAULT FALSE,
            has_business BOOLEAN DEFAULT FALSE,
            has_sciences BOOLEAN DEFAULT FALSE,
            has_humanities BOOLEAN DEFAULT FALSE,
            has_arts BOOLEAN DEFAULT FALSE,
            has_social_sciences BOOLEAN DEFAULT FALSE,
            has_sports_kine BOOLEAN DEFAULT FALSE,
            has_education BOOLEAN DEFAULT FALSE,
            has_law BOOLEAN DEFAULT FALSE,
            has_environment BOOLEAN DEFAULT FALSE,
            top_programs TEXT,
            updated_at TIMESTAMP DEFAULT NOW()
        )
    """)

    # Ajouter les colonnes si la table existait déjà sans elles
    for col, typedef in [
        ('retention_rate',    'FLOAT'),
        ('pct_pell_grant',    'FLOAT'),
        ('grad_debt_median',  'INTEGER'),
        ('latitude',          'FLOAT'),
        ('longitude',         'FLOAT'),
        ('website',           'TEXT'),
        ('has_engineering',   'BOOLEAN DEFAULT FALSE'),
        ('has_business',      'BOOLEAN DEFAULT FALSE'),
        ('has_sciences',      'BOOLEAN DEFAULT FALSE'),
        ('has_humanities',    'BOOLEAN DEFAULT FALSE'),
        ('has_arts',          'BOOLEAN DEFAULT FALSE'),
        ('has_social_sciences','BOOLEAN DEFAULT FALSE'),
        ('has_sports_kine',   'BOOLEAN DEFAULT FALSE'),
        ('has_education',     'BOOLEAN DEFAULT FALSE'),
        ('has_law',           'BOOLEAN DEFAULT FALSE'),
        ('has_environment',   'BOOLEAN DEFAULT FALSE'),
        ('top_programs',      'TEXT'),
    ]:
        await conn.execute(f'ALTER TABLE school_data ADD COLUMN IF NOT EXISTS {col} {typedef}')

    # Vider la table pour réinsérer avec les nouvelles colonnes
    await conn.execute('DELETE FROM school_data')
    log.info("Table school_data vidée")

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
