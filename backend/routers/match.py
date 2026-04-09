from fastapi import APIRouter
import asyncpg
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from algo.conversion import convert_to_scy

router = APIRouter()

@router.post("/api/match")
async def compute_match(body: dict):
    times_input = body.get("times", [])
    gender = body.get("gender", "M")
    divisions = body.get("divisions", ["division_1", "division_2", "division_3", "division_4"])

    # 1. Convertir les temps en SCY
    scy_times = {}
    for t in times_input:
        try:
            result = convert_to_scy(t["event"], t["basin"], float(t["time_seconds"]))
            scy_times[t["event"]] = result["scy_seconds"]
        except Exception as e:
            pass

    if not scy_times:
        return {"error": "Aucun temps valide fourni", "matches": []}

    # 2. Requête DB
    conn = await asyncpg.connect(os.environ["DATABASE_URL"])
    div_filter = ",".join(f"'{d}'" for d in divisions)

    rows = await conn.fetch(f"""
        SELECT
            t.swimcloud_id,
            t.name,
            t.division,
            t.state,
            t.city,
            s.event_code,
            MIN(s.time_seconds) as best_time
        FROM sc_teams t
        JOIN sc_swimmers sw ON sw.team_swimcloud_id = t.swimcloud_id
        JOIN sc_times s ON s.swimmer_swimcloud_id = sw.swimcloud_id
        WHERE t.division IN ({div_filter})
        AND sw.gender = $1
        AND sw.is_departing = false
        GROUP BY t.swimcloud_id, t.name, t.division, t.state, t.city, s.event_code
    """, gender)

    await conn.close()

    # 3. Calculer score par université
    scores = {}
    for row in rows:
        tid = row["swimcloud_id"]
        event = row["event_code"]

        if event not in scy_times:
            continue

        if tid not in scores:
            scores[tid] = {
                "team_id": tid,
                "name": row["name"],
                "division": row["division"],
                "state": row["state"],
                "city": row["city"],
                "score": 0,
                "events": {}
            }

        athlete_scy = scy_times[event]
        team_best = row["best_time"]

        # Score : le nageur est dans les 5% du meilleur temps de l'équipe
        ratio = athlete_scy / team_best if team_best > 0 else 999
        if ratio <= 1.05:
            scores[tid]["score"] += 1

        scores[tid]["events"][event] = {
            "athlete_scy": round(athlete_scy, 2),
            "team_best_scy": round(team_best, 2),
            "ratio": round(ratio, 3)
        }

    # 4. Trier et retourner top 20
    results = sorted(scores.values(), key=lambda x: x["score"], reverse=True)
    return {
        "scy_times": {k: round(v, 2) for k, v in scy_times.items()},
        "matches": results[:20]
    }
