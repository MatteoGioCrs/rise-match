import json
import os
import secrets
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

REGIONS = {
    "east":    ["ME","NH","VT","MA","RI","CT","NY","NJ","PA","MD","DE","VA","WV","NC","SC","GA","FL"],
    "west":    ["CA","OR","WA","AK","HI","NV","ID","MT","WY","UT","CO","AZ","NM"],
    "midwest": ["ND","SD","NE","KS","MN","IA","MO","WI","MI","IL","IN","OH"],
    "south":   ["TX","OK","AR","LA","MS","AL","TN","KY"],
}


def academic_grade(ac):
    pts = 0
    ret  = ac.get('retention_rate') or 0
    earn = ac.get('median_earnings') or 0
    adm  = ac.get('admission_rate') or 100
    debt = ac.get('grad_debt_median') or 99999
    if ret > 85:   pts += 25
    elif ret > 75: pts += 15
    if earn > 70000:   pts += 25
    elif earn > 55000: pts += 15
    if adm < 20:   pts += 25
    elif adm < 40: pts += 15
    if debt < 20000:   pts += 25
    elif debt < 28000: pts += 15
    if pts >= 80: return 'A'
    elif pts >= 60: return 'B'
    elif pts >= 40: return 'C'
    elif pts >= 20: return 'D'
    else: return 'F'


def calc_sport_score(athlete_times, team_event_data):
    """
    athlete_times     : {event: seconds}
    team_event_data   : {event: {'active': [times...], 'departing': [times...]}}
    Returns (score_sportif, event_scores, relay_bonus, departing_bonus, rang_estime)
    """
    event_pts      = []
    event_scores   = {}
    top4_by_stroke = {}
    departing_bonus = 0
    rang_estime     = None

    for event, athlete_time in athlete_times.items():
        if event not in team_event_data:
            continue
        ev_data        = team_event_data[event]
        active_times   = sorted(ev_data['active'])
        departing_times = ev_data['departing']

        if not active_times:
            continue

        team_best   = active_times[0]
        faster_active = sum(1 for t in active_times if t < athlete_time)
        rang        = faster_active + 1
        gap         = (athlete_time - team_best) / team_best

        if gap < -0.04:
            pts = 5       # trop dominant
        elif rang == 1:
            pts = 15      # #1 de l'équipe
        elif rang <= 4:
            pts = 25      # zone idéale relay
        elif rang <= 8:
            pts = 15      # compétitif
        elif rang <= 12:
            pts = 8
        else:
            pts = 2

        event_pts.append(pts)

        # Relay bonus : top 4 sur 2+ épreuves de même nage
        stroke = event.split('_')[0].lstrip('0123456789')
        if rang <= 4:
            top4_by_stroke[stroke] = top4_by_stroke.get(stroke, 0) + 1

        # Departing bonus
        if any(t < athlete_time for t in departing_times):
            departing_bonus = 5

        ratio = athlete_time / team_best if team_best > 0 else 999
        event_scores[event] = {
            'athlete_time': round(athlete_time, 2),
            'team_best':    round(team_best, 2),
            'ratio':        round(ratio, 3),
            'rang':         rang,
            'pts':          pts,
        }
        if rang_estime is None:
            rang_estime = rang

    if not event_pts:
        return None, {}, 0, 0, None

    relay_bonus  = 5 if any(v >= 2 for v in top4_by_stroke.values()) else 0
    avg_pts      = sum(event_pts) / len(event_pts)
    score_sportif = min(int(avg_pts / 25 * 50) + relay_bonus + departing_bonus, 50)

    return score_sportif, event_scores, relay_bonus, departing_bonus, rang_estime


@router.get("/api/school/{team_id}")
async def get_school(team_id: int):
    conn = await asyncpg.connect(os.environ["DATABASE_URL"])
    try:
        team = await conn.fetchrow("""
            SELECT t.*, sd.admission_rate, sd.tuition_out_state,
                   sd.enrollment_total, sd.median_earnings, sd.school_type,
                   sd.retention_rate, sd.pct_pell_grant, sd.grad_debt_median,
                   sd.latitude, sd.longitude, sd.website, sd.scorecard_name
            FROM sc_teams t
            LEFT JOIN school_data sd ON sd.swimcloud_id = t.swimcloud_id
            WHERE t.swimcloud_id = $1
        """, team_id)

        if not team:
            return {"error": "École non trouvée"}

        times_m = await conn.fetch("""
            SELECT s.event_code, MIN(s.time_seconds) as best_time,
                   sw.name as swimmer_name
            FROM sc_swimmers sw
            JOIN sc_times s ON s.swimmer_swimcloud_id = sw.swimcloud_id
            WHERE sw.team_swimcloud_id = $1 AND sw.gender = 'M'
            AND sw.is_departing = false
            GROUP BY s.event_code, sw.name
            ORDER BY s.event_code, best_time
        """, team_id)

        times_f = await conn.fetch("""
            SELECT s.event_code, MIN(s.time_seconds) as best_time,
                   sw.name as swimmer_name
            FROM sc_swimmers sw
            JOIN sc_times s ON s.swimmer_swimcloud_id = sw.swimcloud_id
            WHERE sw.team_swimcloud_id = $1 AND sw.gender = 'F'
            AND sw.is_departing = false
            GROUP BY s.event_code, sw.name
            ORDER BY s.event_code, best_time
        """, team_id)

        counts = await conn.fetchrow("""
            SELECT
                COUNT(*) FILTER (WHERE gender = 'M' AND is_departing = false) as men,
                COUNT(*) FILTER (WHERE gender = 'F' AND is_departing = false) as women,
                COUNT(*) FILTER (WHERE is_departing = true) as departing
            FROM sc_swimmers
            WHERE team_swimcloud_id = $1
        """, team_id)

        def format_time(t):
            mins = int(t // 60)
            secs = t % 60
            return f"{mins}:{secs:05.2f}" if mins > 0 else f"{secs:.2f}"

        def process_times(rows):
            by_event = {}
            for row in rows:
                ev = row['event_code']
                if ev not in by_event:
                    by_event[ev] = {
                        'best_seconds': round(row['best_time'], 2),
                        'best_display': format_time(row['best_time']),
                        'best_swimmer': row['swimmer_name']
                    }
            return by_event

        team_dict = dict(team)
        if team_dict.get('admission_rate'):
            team_dict['admission_rate'] = round(team_dict['admission_rate'] * 100, 1)
        if team_dict.get('retention_rate'):
            team_dict['retention_rate'] = round(team_dict['retention_rate'] * 100, 1)
        if team_dict.get('pct_pell_grant'):
            team_dict['pct_pell_grant'] = round(team_dict['pct_pell_grant'] * 100, 1)

        return {
            "team": team_dict,
            "roster_counts": dict(counts),
            "times_men": process_times(times_m),
            "times_women": process_times(times_f),
        }
    finally:
        await conn.close()


@router.post("/api/match")
async def compute_match(body: dict):
    times_input    = body.get("times", [])
    gender         = body.get("gender", "M")
    divisions      = body.get("divisions", ["division_1","division_2","division_3","division_4"])
    states_wanted  = body.get("states", [])
    regions_wanted = body.get("regions", [])
    specialite     = body.get("specialite", "all")

    ncaa_divs      = [d for d in divisions if d != "division_10"]
    include_usports = "division_10" in divisions

    # --- Convert athlete times ---
    scy_times = {}
    for t in times_input:
        try:
            result = convert_to_scy(t["event"], t["basin"], float(t["time_seconds"]))
            if result.get("scy_seconds"):
                scy_times[t["event"]] = result["scy_seconds"]
        except:
            pass

    lcm_times = {}
    for t in times_input:
        try:
            event        = t["event"]
            usports_event = USPORTS_EVENT_MAP.get(event, event)
            lcm_times[usports_event] = float(t["time_seconds"])
        except:
            pass

    if not scy_times and not lcm_times:
        return {"error": "Aucun temps valide", "matches": []}

    conn   = await asyncpg.connect(os.environ["DATABASE_URL"])
    scores = {}

    try:
        # ── NCAA : per-swimmer times ──────────────────────────────────────────
        if ncaa_divs and scy_times:
            div_filter = ",".join(f"'{d}'" for d in ncaa_divs)
            event_list = list(scy_times.keys())

            rows = await conn.fetch(f"""
                SELECT sw.team_swimcloud_id, t.name, t.division, t.state, t.city,
                       sw.swimcloud_id as swimmer_id, sw.is_departing,
                       s.event_code, MIN(s.time_seconds) as best_time
                FROM sc_teams t
                JOIN sc_swimmers sw ON sw.team_swimcloud_id = t.swimcloud_id
                JOIN sc_times s ON s.swimmer_swimcloud_id = sw.swimcloud_id
                WHERE t.division IN ({div_filter})
                AND sw.gender = $1
                AND s.event_code = ANY($2)
                GROUP BY sw.team_swimcloud_id, t.name, t.division, t.state, t.city,
                         sw.swimcloud_id, sw.is_departing, s.event_code
            """, gender, event_list)

            team_meta    = {}
            team_ev_data = {}
            for row in rows:
                tid = row['team_swimcloud_id']
                if tid not in team_meta:
                    team_meta[tid] = {
                        'name': row['name'], 'division': row['division'],
                        'state': row['state'], 'city': row['city'],
                    }
                    team_ev_data[tid] = {}
                ev = row['event_code']
                if ev not in team_ev_data[tid]:
                    team_ev_data[tid][ev] = {'active': [], 'departing': []}
                key = 'departing' if row['is_departing'] else 'active'
                team_ev_data[tid][ev][key].append(row['best_time'])

            for tid, meta in team_meta.items():
                sp, ev_scores, rb, db, rang = calc_sport_score(scy_times, team_ev_data[tid])
                if sp is None:
                    continue
                scores[tid] = {
                    'team_id': tid, 'name': meta['name'],
                    'division': meta['division'], 'state': meta['state'],
                    'city': meta['city'], 'country': 'US',
                    'score': sp, 'score_sportif': sp,
                    'score_academique': 0, 'score_geo': 0, 'score_total': sp,
                    'academic_grade': 'N/A',
                    'rang_estime': rang, 'relay_bonus': rb, 'departing_bonus': db,
                    'events': ev_scores, 'academic': None, 'team_times': {},
                }

        # ── USports : per-swimmer times (LCM) ────────────────────────────────
        if include_usports and lcm_times:
            event_list_lcm = list(lcm_times.keys())

            rows_ca = await conn.fetch("""
                SELECT sw.team_swimcloud_id, t.name, t.division, t.state, t.city,
                       sw.swimcloud_id as swimmer_id, sw.is_departing,
                       s.event_code, MIN(s.time_seconds) as best_time
                FROM sc_teams t
                JOIN sc_swimmers sw ON sw.team_swimcloud_id = t.swimcloud_id
                JOIN sc_times s ON s.swimmer_swimcloud_id = sw.swimcloud_id
                WHERE t.division = 'division_10'
                AND sw.gender = $1
                AND s.event_code = ANY($2)
                GROUP BY sw.team_swimcloud_id, t.name, t.division, t.state, t.city,
                         sw.swimcloud_id, sw.is_departing, s.event_code
            """, gender, event_list_lcm)

            team_meta_ca    = {}
            team_ev_data_ca = {}
            for row in rows_ca:
                raw_tid = row['team_swimcloud_id']
                tid = f"ca_{raw_tid}"
                if tid not in team_meta_ca:
                    team_meta_ca[tid] = {
                        'name': row['name'], 'division': 'division_10',
                        'state': row['state'], 'city': row['city'],
                    }
                    team_ev_data_ca[tid] = {}
                ev = row['event_code']
                if ev not in team_ev_data_ca[tid]:
                    team_ev_data_ca[tid][ev] = {'active': [], 'departing': []}
                key = 'departing' if row['is_departing'] else 'active'
                team_ev_data_ca[tid][ev][key].append(row['best_time'])

            for tid, meta in team_meta_ca.items():
                sp, ev_scores, rb, db, rang = calc_sport_score(lcm_times, team_ev_data_ca[tid])
                if sp is None:
                    continue
                scores[tid] = {
                    'team_id': tid, 'name': meta['name'],
                    'division': 'USports', 'state': meta['state'],
                    'city': meta['city'], 'country': 'CA',
                    'score': sp, 'score_sportif': sp,
                    'score_academique': 0, 'score_geo': 0, 'score_total': sp,
                    'academic_grade': 'N/A',
                    'rang_estime': rang, 'relay_bonus': rb, 'departing_bonus': db,
                    'events': ev_scores, 'academic': None, 'team_times': {},
                }

        # ── Academic + Geo scoring ────────────────────────────────────────────
        if scores:
            int_ids = [v['team_id'] for v in scores.values() if isinstance(v['team_id'], int)]
            academic_map = {}
            if int_ids:
                ac_rows = await conn.fetch("""
                    SELECT swimcloud_id, admission_rate, tuition_out_state,
                           enrollment_total, median_earnings, school_type, scorecard_name,
                           retention_rate, pct_pell_grant, grad_debt_median,
                           latitude, longitude, website,
                           has_engineering, has_business, has_sciences, has_humanities,
                           has_arts, has_social_sciences, has_sports_kine, has_education,
                           has_law, has_environment, top_programs
                    FROM school_data WHERE swimcloud_id = ANY($1)
                """, int_ids)
                academic_map = {row['swimcloud_id']: dict(row) for row in ac_rows}

            for tid, data in scores.items():
                real_id = data['team_id']
                ac_raw  = academic_map.get(real_id) if isinstance(real_id, int) else None

                score_acad = 0
                if ac_raw:
                    adm  = round(ac_raw['admission_rate'] * 100, 1) if ac_raw['admission_rate'] else None
                    ret  = round(ac_raw['retention_rate'] * 100, 1) if ac_raw['retention_rate'] else None
                    pell = round(ac_raw['pct_pell_grant'] * 100, 1) if ac_raw['pct_pell_grant'] else None

                    data['academic'] = {
                        'admission_rate':    adm,
                        'tuition_out_state': ac_raw['tuition_out_state'],
                        'enrollment_total':  ac_raw['enrollment_total'],
                        'median_earnings':   ac_raw['median_earnings'],
                        'school_type':       ac_raw['school_type'],
                        'retention_rate':    ret,
                        'pct_pell_grant':    pell,
                        'grad_debt_median':  ac_raw['grad_debt_median'],
                        'latitude':          ac_raw['latitude'],
                        'longitude':         ac_raw['longitude'],
                        'website':           ac_raw['website'],
                        'has_engineering':   ac_raw.get('has_engineering'),
                        'has_business':      ac_raw.get('has_business'),
                        'has_sciences':      ac_raw.get('has_sciences'),
                        'has_humanities':    ac_raw.get('has_humanities'),
                        'has_arts':          ac_raw.get('has_arts'),
                        'has_social_sciences': ac_raw.get('has_social_sciences'),
                        'has_sports_kine':   ac_raw.get('has_sports_kine'),
                        'has_education':     ac_raw.get('has_education'),
                        'has_law':           ac_raw.get('has_law'),
                        'has_environment':   ac_raw.get('has_environment'),
                        'top_programs':      ac_raw.get('top_programs'),
                    }

                    # Spécialité (15 pts)
                    if specialite and specialite != 'all':
                        if ac_raw.get(specialite):
                            score_acad += 15
                    else:
                        score_acad += 15

                    # Qualité académique (10 pts)
                    ret_val  = ret  or 0
                    earn_val = ac_raw['median_earnings'] or 0
                    adm_val  = adm  or 100
                    if ret_val > 85:   score_acad += 4
                    elif ret_val > 75: score_acad += 2
                    if earn_val > 70000:   score_acad += 4
                    elif earn_val > 55000: score_acad += 2
                    if adm_val < 30: score_acad += 2
                    score_acad = min(score_acad, 25)

                    data['academic_grade'] = academic_grade({
                        'retention_rate':  ret_val,
                        'median_earnings': earn_val,
                        'admission_rate':  adm_val,
                        'grad_debt_median': ac_raw['grad_debt_median'] or 99999,
                    })

                # Géographie (15 pts) — toutes les équipes
                team_state = data.get('state') or ''
                score_geo  = 0
                if states_wanted:
                    if team_state in states_wanted:
                        score_geo = 15
                elif regions_wanted:
                    for region, state_list in REGIONS.items():
                        if region in regions_wanted and team_state in state_list:
                            score_geo = 15
                            break
                else:
                    score_geo = 15

                data['score_academique'] = score_acad
                data['score_geo']        = score_geo
                data['score_total']      = data['score_sportif'] + score_acad + score_geo
                data['score']            = data['score_total']

    finally:
        await conn.close()

    results = sorted(scores.values(), key=lambda x: x['score_total'], reverse=True)

    # ── Enrich top 20 with full team roster times ─────────────────────────────
    top_ids = [r['team_id'] for r in results[:20] if isinstance(r['team_id'], int)]
    if top_ids:
        conn2 = await asyncpg.connect(os.environ["DATABASE_URL"])
        all_times_rows = await conn2.fetch("""
            SELECT t.swimcloud_id, s.event_code, MIN(s.time_seconds) as best_time
            FROM sc_teams t
            JOIN sc_swimmers sw ON sw.team_swimcloud_id = t.swimcloud_id
            JOIN sc_times s ON s.swimmer_swimcloud_id = sw.swimcloud_id
            WHERE t.swimcloud_id = ANY($1)
            AND sw.gender = $2
            AND sw.is_departing = false
            GROUP BY t.swimcloud_id, s.event_code
            ORDER BY t.swimcloud_id, s.event_code
        """, top_ids, gender)
        await conn2.close()

        team_all_times = {}
        for row in all_times_rows:
            tid = row['swimcloud_id']
            if tid not in team_all_times:
                team_all_times[tid] = {}
            t    = row['best_time']
            mins = int(t // 60)
            secs = t % 60
            team_all_times[tid][row['event_code']] = {
                'seconds': round(t, 2),
                'display': f"{mins}:{secs:05.2f}" if mins > 0 else f"{secs:.2f}"
            }

        for r in results[:20]:
            tid = r['team_id']
            r['team_times'] = team_all_times.get(tid, {}) if isinstance(tid, int) else {}
    else:
        for r in results[:20]:
            r['team_times'] = {}

    session_token = secrets.token_urlsafe(16)
    try:
        conn3 = await asyncpg.connect(os.environ["DATABASE_URL"])
        top_name = results[0]["name"] if results else None
        await conn3.execute(
            """INSERT INTO search_sessions
                   (session_token, gender, divisions, times_input, results_count, top_match)
               VALUES ($1, $2, $3, $4::jsonb, $5, $6)
               ON CONFLICT (session_token) DO NOTHING""",
            session_token, gender, divisions, json.dumps(times_input), len(results), top_name,
        )
        await conn3.close()
    except Exception:
        pass  # ne pas bloquer la réponse

    return {
        "session_token": session_token,
        "scy_times": {k: round(v, 2) for k, v in scy_times.items()},
        "matches": results[:20]
    }
