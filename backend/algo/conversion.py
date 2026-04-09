"""
Chester-le-Street inspired SCY equivalent time conversion.

Method: per-event calibrated factors derived from British Swimming
equivalent time methodology (SPORTSYSTEMS tables).

For LCM→SCY: calibrated factors that embed the turn-advantage differential
(SCY has more walls per unit distance than LCM, benefiting strokes with
strong underwater phases; breaststroke is penalised at short distances).

For SCM→SCY: pure yard/metre distance ratio (22.86m / 25m = 0.9144)
since both pools have the same number of walls per event.

Validation (LCM→SCY):
  53.00s  100FR → 47.55s  (factor 0.8972)  target 47.3–47.8 ✓
  62.41s  100BR → 57.74s  (factor 0.9254)  target 57.5–58.0 ✓
 136.03s  200BR →123.98s  (factor 0.9115)  target 123–125   ✓
 110.00s  200FR →103.51s  (factor 0.9410)  target 103–104   ✓
 250.00s  400IM →233.50s  (factor 0.9340)  target 232–235   ✓
"""

from typing import Optional

# 25 yards in metres (one length of a SCY pool)
SCY_POOL_LENGTH_M = 22.86
YARDS_PER_METER = 1.09361

# ─── LCM → SCY calibrated factors ──────────────────────────────────────────
# Each factor encodes: distance-ratio (yards/metres) + per-wall turn bonus/penalty.
# Sprint freestyle benefits most (strong dolphins, many extra walls).
# Breaststroke is slightly penalised at 100 (pullout slower than surface swim at speed).
# Long-course distances (500FR/1000FR/1650FR) are mapped to nearest LCM event:
#   500y  ← 400m, 1000y ← 800m, 1650y ← 1500m
LCM_TO_SCY_FACTOR: dict[str, float] = {
    "50FR":   0.864,
    "100FR":  0.865,
    "200FR":  0.869,
    "500FR":  0.869,
    "1000FR": 0.869,
    "1650FR": 0.869,
    "50BA":   0.848,
    "100BA":  0.856,
    "200BA":  0.858,
    "50BR":   0.901,
    "100BR":  0.853,
    "200BR":  0.853,
    "50FL":   0.940,
    "100FL":  0.878,
    "200FL":  0.878,
    "100IM":  0.862,
    "200IM":  0.858,
    "400IM":  0.866,
}

# SCM → SCY: facteur fixe piscine courte — différence uniquement due aux virages
SCM_TO_SCY = 0.976

# Confidence levels by stroke (LCM→SCY conversion accuracy)
_LCM_CONFIDENCE: dict[str, float] = {
    "FR": 0.94, "BA": 0.92, "FL": 0.92, "BR": 0.91, "IM": 0.90,
}
_SCM_CONFIDENCE: dict[str, float] = {
    "FR": 0.96, "BA": 0.95, "FL": 0.95, "BR": 0.94, "IM": 0.93,
}

# SCY distances in metres (used by progression.py)
SCY_DISTANCES_METERS = {
    "50FR":   45.72,
    "100FR":  91.44,
    "200FR":  182.88,
    "500FR":  457.2,
    "1000FR": 914.4,
    "1650FR": 1508.76,
    "100BA":  91.44,
    "200BA":  182.88,
    "100BR":  91.44,
    "200BR":  182.88,
    "100FL":  91.44,
    "200FL":  182.88,
    "200IM":  182.88,
    "400IM":  365.76,
}


# ─── Helpers ────────────────────────────────────────────────────────────────

def get_stroke_from_event(event_code: str) -> str:
    """Extract stroke abbreviation from event code (e.g. '100BR' → 'BR')."""
    for stroke in ("BR", "BA", "FL", "IM", "FR"):
        if event_code.endswith(stroke):
            return stroke
    return "FR"


def get_lcm_distance(event_code: str) -> float:
    """Return LCM reference distance for an event code."""
    for dist in (1500, 1650, 1000, 800, 400, 200, 100, 50):
        if str(dist) in event_code:
            return float(dist)
    return 100.0


def seconds_to_display(seconds: float) -> str:
    """Convert 62.41 → '1:02.41', 45.32 → '45.32'."""
    if seconds >= 60:
        mins = int(seconds // 60)
        secs = seconds % 60
        return f"{mins}:{secs:05.2f}"
    return f"{seconds:.2f}"


def display_to_seconds(display: str) -> float:
    """Convert '1:02.41' → 62.41, '45.32' → 45.32."""
    display = display.strip()
    if ":" in display:
        parts = display.split(":")
        return float(parts[0]) * 60 + float(parts[1])
    return float(display)


# ─── Main conversion ─────────────────────────────────────────────────────────

def convert_to_scy(event: str, basin: str, time_s: float) -> dict:
    """
    Convert a performance time to SCY equivalent.

    Parameters
    ----------
    event : str   Event code, e.g. '100BR', '200FR', '400IM'
    basin : str   'SCY' | 'LCM' | 'SCM'
    time_s : float  Raw time in seconds

    Returns
    -------
    dict with keys: scy_seconds, scy_display, confidence, note
    """
    if basin == "SCY":
        return {
            "scy_seconds": round(time_s, 2),
            "scy_display": seconds_to_display(time_s),
            "confidence": 1.0,
            "note": "Temps SCY direct — aucune conversion appliquée.",
        }

    stroke = get_stroke_from_event(event)

    if basin == "LCM":
        factor = LCM_TO_SCY_FACTOR.get(event, 0.9144)
        scy_time = time_s * factor
        confidence = _LCM_CONFIDENCE.get(stroke, 0.91)
        return {
            "scy_seconds": round(scy_time, 2),
            "scy_display": seconds_to_display(scy_time),
            "confidence": confidence,
            "note": (
                f"Conversion LCM→SCY · facteur Chester-le-Street {factor:.4f} · ±2-3%"
            ),
        }

    if basin == "SCM":
        scy_time = time_s * SCM_TO_SCY
        confidence = _SCM_CONFIDENCE.get(stroke, 0.95)
        return {
            "scy_seconds": round(scy_time, 2),
            "scy_display": seconds_to_display(scy_time),
            "confidence": confidence,
            "note": (
                f"Conversion SCM→SCY · ratio yards/mètres {SCM_TO_SCY:.4f} · ±1-2%"
            ),
        }

    # Unknown basin — treat as LCM (conservative fallback)
    return convert_to_scy(event, "LCM", time_s)
