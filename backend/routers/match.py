from fastapi import APIRouter
import asyncpg
import os
from algo.conversion import convert_to_scy

router = APIRouter()

# Mapping épreuves NCAA yards → codes de stockage USports mètres
USPORTS_EVENT_MAP = {
    '500FR':  '400FR_LCM',
    '1000FR': '800FR_LCM',
    '1650FR': '1500FR_LCM',
    # toutes les autres épreuves : même code
}


def _score_ratio(scores: dict, tid: int, ratio: float) -> None:
    if ratio <= 1.0:
        scores[tid]["score"] += 3
    elif ratio <= 1.02:
        scores[tid]["score"] += 2
    elif ratio <= 1.05:
        scores[tid]["score"] += 1
    scores[tid]["score_decimal"] = scores[tid].get("score_decimal", 0) + (1 - ratio)


@router.post("/api/match")
async def compute_match(body: dict):
    times_input = body.get("times", [])
    gender = body.get("gender", "M")
    divisions = body.get("divisions", ["division_1", "division_2", "division_3", "division_4"])

    # Séparer les divisions
    ncaa_divisions = [d for d in divisions if d != 'division_10']
    include_usports = 'division_10' in divisions

    if not times_input:
        return {"error": "Aucun temps valide fourni", "matches": []}

    # 1. Préparer les temps : SCY pour NCAA, LCM direct pour USports
    scy_times: dict[str, float] = {}
    lcm_times: dict[str, float] = {}

    for t in times_input:
        event = t.get("event", "")
        basin = t.get("basin", "LCM")
        try:
            time_s = float(t["time_seconds"])
        except (KeyError, ValueError):
            continue
        if not event or time_s <= 0:
            continue

        # Conversion SCY pour NCAA
        try:
            result = convert_to_scy(event, basin, time_s)
            scy_times[event] = result["scy_seconds"]
        except Exception:
            pass

        # LCM direct pour USports (seulement si bassin LCM)
        if basin == "LCM":
            us_ec = USPORTS_EVENT_MAP.get(event, event)
            lcm_times[us_ec] = time_s

    if not scy_times and not lcm_times:
        return {"error": "Aucun temps valide fourni", "matches": []}

    conn = await asyncpg.connect(os.environ["DATABASE_URL"])
    scores: dict = {}

    # 2a. Matching NCAA (SCY)
    if ncaa_divisions and scy_times:
        div_filter = ",".join(f"'{d}'" for d in ncaa_divisions)
        rows = await conn.fetch(f"""
            SELECT
                t.swimcloud_id, t.name, t.division, t.state, t.city,
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
                    "team_id": tid, "name": row["name"], "division": row["division"],
                    "state": row["state"], "city": row["city"], "score": 0, "events": {}
                }
            athlete_scy = scy_times[event]
            team_best = row["best_time"]
            ratio = athlete_scy / team_best if team_best > 0 else 999
            _score_ratio(scores, tid, ratio)
            scores[tid]["events"][event] = {
                "athlete_scy": round(athlete_scy, 2),
                "team_best_scy": round(team_best, 2),
                "ratio": round(ratio, 3)
            }

    # 2b. Matching USports (LCM direct)
    if include_usports and lcm_times:
        rows_us = await conn.fetch("""
            SELECT
                t.swimcloud_id, t.name, t.division, t.state, t.city,
                s.event_code, MIN(s.time_seconds) as best_time
            FROM sc_teams t
            JOIN sc_swimmers sw ON sw.team_swimcloud_id = t.swimcloud_id
            JOIN sc_times s ON s.swimmer_swimcloud_id = sw.swimcloud_id
            WHERE t.division = 'division_10'
            AND sw.gender = $1
            AND sw.is_departing = false
            GROUP BY t.swimcloud_id, t.name, t.division, t.state, t.city, s.event_code
        """, gender)

        for row in rows_us:
            tid = row["swimcloud_id"]
            event = row["event_code"]
            if event not in lcm_times:
                continue
            if tid not in scores:
                scores[tid] = {
                    "team_id": tid, "name": row["name"], "division": row["division"],
                    "state": row["state"], "city": row["city"], "score": 0, "events": {}
                }
            athlete_lcm = lcm_times[event]
            team_best = row["best_time"]
            ratio = athlete_lcm / team_best if team_best > 0 else 999
            _score_ratio(scores, tid, ratio)
            scores[tid]["events"][event] = {
                "athlete_scy": round(athlete_lcm, 2),  # champ conservé pour compatibilité frontend
                "team_best_scy": round(team_best, 2),
                "ratio": round(ratio, 3)
            }

    await conn.close()

    # 3. Fusionner et trier
    results = sorted(scores.values(),
        key=lambda x: (x["score"], x.get("score_decimal", 0)),
        reverse=True)
    return {
        "scy_times": {k: round(v, 2) for k, v in scy_times.items()},
        "matches": results[:20]
    }
