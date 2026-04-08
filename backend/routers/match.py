import os
import asyncpg
from fastapi import APIRouter
from algo.conversion import convert_to_scy, display_to_seconds

router = APIRouter()


@router.post("/api/match")
async def compute_match(body: dict):
    """
    Input:
    {
        "times": [
            {"event": "100BR", "basin": "LCM", "time": "1:02.41"},
            {"event": "200BR", "basin": "LCM", "time": "2:18.50"}
        ],
        "gender": "M",
        "divisions": ["division_1", "division_2", "division_3", "division_4"]
    }

    Logique:
    1. Convertir les temps LCM/SCM → SCY
    2. Pour chaque équipe (filtrée par divisions) :
       - Récupérer les 8 meilleurs temps de l'équipe par épreuve
       - Compter combien d'épreuves le nageur scorerait dans le top 8
    3. Retourner le top 10 trié par score décroissant
    """
    times_input = body.get("times", [])
    gender = body.get("gender", "M")
    divisions = body.get("divisions", ["division_1", "division_2", "division_3", "division_4"])

    if not times_input:
        return {"error": "Aucun temps fourni", "results": []}

    # Étape 1 — Convertir les temps du nageur en SCY
    swimmer_scy: dict[str, float] = {}
    conversions: list[dict] = []
    for entry in times_input:
        event = entry.get("event", "").upper()
        basin = entry.get("basin", "LCM").upper()
        time_str = entry.get("time", "")
        if not event or not time_str:
            continue
        time_s = display_to_seconds(time_str)
        result = convert_to_scy(event, basin, time_s)
        swimmer_scy[event] = result["scy_seconds"]
        conversions.append({
            "event": event,
            "input": time_str,
            "basin": basin,
            "scy_seconds": result["scy_seconds"],
            "scy_display": result["scy_display"],
            "confidence": result["confidence"],
            "note": result["note"],
        })

    if not swimmer_scy:
        return {"error": "Temps invalides", "results": []}

    swimmer_events = list(swimmer_scy.keys())

    # Étape 2 — Interroger la DB
    conn = await asyncpg.connect(os.environ["DATABASE_URL"])

    # Récupérer toutes les équipes dans les divisions demandées
    division_placeholders = ", ".join(f"${i+1}" for i in range(len(divisions)))
    teams = await conn.fetch(
        f"SELECT swimcloud_id, name, abbr, city, state, division FROM sc_teams WHERE division = ANY(ARRAY[{division_placeholders}]::text[])",
        *divisions,
    )

    scores = []
    for team in teams:
        team_id = team["swimcloud_id"]
        scoring_events = []

        for event in swimmer_events:
            swimmer_time = swimmer_scy[event]

            # Top 8 de l'équipe pour cet événement (gender filtré)
            top8 = await conn.fetch(
                """
                SELECT t.time_seconds
                FROM sc_times t
                JOIN sc_swimmers s ON s.swimcloud_id = t.swimmer_swimcloud_id
                WHERE s.team_swimcloud_id = $1
                  AND t.event_code = $2
                  AND s.gender = $3
                ORDER BY t.time_seconds ASC
                LIMIT 8
                """,
                team_id, event, gender,
            )

            if not top8:
                continue

            worst_top8 = top8[-1]["time_seconds"]
            rank_in_team = None
            for i, row in enumerate(top8):
                if swimmer_time <= row["time_seconds"]:
                    rank_in_team = i + 1
                    break
            if rank_in_team is None and swimmer_time <= worst_top8:
                rank_in_team = len(top8) + 1

            if rank_in_team is not None and rank_in_team <= 8:
                scoring_events.append({
                    "event": event,
                    "rank_in_team": rank_in_team,
                    "swimmer_scy": swimmer_time,
                    "team_8th_time": round(worst_top8, 2),
                })

        if scoring_events:
            score = sum(9 - e["rank_in_team"] for e in scoring_events)
            scores.append({
                "team_id": team_id,
                "name": team["name"],
                "abbr": team["abbr"],
                "city": team["city"],
                "state": team["state"],
                "division": team["division"],
                "score": score,
                "scoring_events": scoring_events,
            })

    await conn.close()

    # Étape 3 — Top 10
    scores.sort(key=lambda x: x["score"], reverse=True)
    top10 = scores[:10]

    return {
        "swimmer_conversions": conversions,
        "results": top10,
        "total_teams_evaluated": len(teams),
        "teams_with_fit": len(scores),
    }
