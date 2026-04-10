import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncpg
from fastapi import APIRouter
from algo.conversion import convert_to_scy

router = APIRouter()

USPORTS_EVENT_MAP = {
    '500FR': '400FR_LCM',
    '1000FR': '800FR_LCM',
    '1650FR': '1500FR_LCM',
}

@router.post("/api/match")
async def compute_match(body: dict):
    times_input = body.get("times", [])
    gender = body.get("gender", "M")
    divisions = body.get("divisions", ["division_1","division_2","division_3","division_4"])

    ncaa_divs = [d for d in divisions if d != "division_10"]
    include_usports = "division_10" in divisions

    # Convertir les temps en SCY pour NCAA
    scy_times = {}
    for t in times_input:
        try:
            result = convert_to_scy(t["event"], t["basin"], float(t["time_seconds"]))
            if result.get("scy_seconds"):
                scy_times[t["event"]] = result["scy_seconds"]
        except:
            pass

    # Temps LCM bruts pour USports
    lcm_times = {}
    for t in times_input:
        try:
            event = t["event"]
            usports_event = USPORTS_EVENT_MAP.get(event, event)
            lcm_times[usports_event] = float(t["time_seconds"])
        except:
            pass

    if not scy_times and not lcm_times:
        return {"error": "Aucun temps valide", "matches": []}

    conn = await asyncpg.connect(os.environ["DATABASE_URL"])
    scores = {}

    try:
        # --- NCAA matching (SCY) ---
        if ncaa_divs and scy_times:
            div_filter = ",".join(f"'{d}'" for d in ncaa_divs)
            rows = await conn.fetch(f"""
                SELECT t.swimcloud_id, t.name, t.division, t.state, t.city,
                       s.event_code, MIN(s.time_seconds) as best_time
                FROM sc_teams t
                JOIN sc_swimmers sw ON sw.team_swimcloud_id = t.swimcloud_id
                JOIN sc_times s ON s.swimmer_swimcloud_id = sw.swimcloud_id
                WHERE t.division IN ({div_filter})
                AND sw.gender = $1
                AND sw.is_departing = false
                GROUP BY t.swimcloud_id, t.name, t.division, t.state, t.city, s.event_code
            """, gender)

            for row in rows:
                tid = row["swimcloud_id"]
                event = row["event_code"]
                if event not in scy_times:
                    continue
                if tid not in scores:
                    scores[tid] = {
                        "team_id": tid, "name": row["name"],
                        "division": row["division"], "state": row["state"],
                        "city": row["city"], "country": "US",
                        "score": 0, "score_decimal": 0.0, "events": {}
                    }
                athlete_scy = scy_times[event]
                team_best = row["best_time"]
                ratio = athlete_scy / team_best if team_best > 0 else 999
                if ratio <= 1.0:
                    scores[tid]["score"] += 3
                elif ratio <= 1.02:
                    scores[tid]["score"] += 2
                elif ratio <= 1.05:
                    scores[tid]["score"] += 1
                scores[tid]["score_decimal"] += (1 - ratio)
                scores[tid]["events"][event] = {
                    "athlete_time": round(athlete_scy, 2),
                    "team_best": round(team_best, 2),
                    "ratio": round(ratio, 3)
                }

        # --- USports matching (LCM direct) ---
        if include_usports and lcm_times:
            rows_ca = await conn.fetch("""
                SELECT t.swimcloud_id, t.name, t.division, t.state, t.city,
                       s.event_code, MIN(s.time_seconds) as best_time
                FROM sc_teams t
                JOIN sc_swimmers sw ON sw.team_swimcloud_id = t.swimcloud_id
                JOIN sc_times s ON s.swimmer_swimcloud_id = sw.swimcloud_id
                WHERE t.division = 'division_10'
                AND sw.gender = $1
                AND sw.is_departing = false
                GROUP BY t.swimcloud_id, t.name, t.division, t.state, t.city, s.event_code
            """, gender)

            for row in rows_ca:
                tid = f"ca_{row['swimcloud_id']}"
                event = row["event_code"]
                if event not in lcm_times:
                    continue
                if tid not in scores:
                    scores[tid] = {
                        "team_id": tid, "name": row["name"],
                        "division": "USports", "state": row["state"],
                        "city": row["city"], "country": "CA",
                        "score": 0, "score_decimal": 0.0, "events": {}
                    }
                athlete_lcm = lcm_times[event]
                team_best = row["best_time"]
                ratio = athlete_lcm / team_best if team_best > 0 else 999
                if ratio <= 1.0:
                    scores[tid]["score"] += 3
                elif ratio <= 1.02:
                    scores[tid]["score"] += 2
                elif ratio <= 1.05:
                    scores[tid]["score"] += 1
                scores[tid]["score_decimal"] += (1 - ratio)
                scores[tid]["events"][event] = {
                    "athlete_time": round(athlete_lcm, 2),
                    "team_best": round(team_best, 2),
                    "ratio": round(ratio, 3)
                }

        # Récupérer les données académiques pour les équipes dans les résultats
        if scores:
            team_ids = [v['team_id'] for v in scores.values() if isinstance(v['team_id'], int)]
            if team_ids:
                academic_rows = await conn.fetch("""
                    SELECT swimcloud_id, admission_rate, tuition_out_state,
                           enrollment_total, median_earnings, school_type, scorecard_name,
                           retention_rate, pct_pell_grant, grad_debt_median,
                           latitude, longitude, website
                    FROM school_data
                    WHERE swimcloud_id = ANY($1)
                """, team_ids)

                academic_data = {row['swimcloud_id']: dict(row) for row in academic_rows}

                for tid, data in scores.items():
                    real_id = data['team_id']
                    if isinstance(real_id, int) and real_id in academic_data:
                        ac = academic_data[real_id]
                        data['academic'] = {
                            'admission_rate': round(ac['admission_rate'] * 100, 1) if ac['admission_rate'] else None,
                            'tuition_out_state': ac['tuition_out_state'],
                            'enrollment_total': ac['enrollment_total'],
                            'median_earnings': ac['median_earnings'],
                            'school_type': ac['school_type'],
                            'retention_rate': round(ac['retention_rate'] * 100, 1) if ac['retention_rate'] else None,
                            'pct_pell_grant': round(ac['pct_pell_grant'] * 100, 1) if ac['pct_pell_grant'] else None,
                            'grad_debt_median': ac['grad_debt_median'],
                            'latitude': ac['latitude'],
                            'longitude': ac['longitude'],
                            'website': ac['website'],
                        }
                    else:
                        data['academic'] = None

    finally:
        await conn.close()

    results = sorted(
        scores.values(),
        key=lambda x: (x["score"], x["score_decimal"]),
        reverse=True
    )

    return {
        "scy_times": {k: round(v, 2) for k, v in scy_times.items()},
        "matches": results[:20]
    }
