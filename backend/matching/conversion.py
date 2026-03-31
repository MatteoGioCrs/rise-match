"""
Wall-based SCY conversion model.
Physics: each wall (start + flip turn) saves time via push-off + underwater phase.
More walls in SCY = faster times, especially for freestyle/fly/back.
Breaststroke benefits less (pullout limited to 1 stroke + 1 kick per turn by rules).
"""

# Yards per meter
YARDS_PER_METER = 1.09361

# Distance in meters for each SCY event
SCY_DISTANCES_METERS = {
    '50FR':   45.72,
    '100FR':  91.44,
    '200FR':  182.88,
    '500FR':  457.2,
    '1000FR': 914.4,
    '1650FR': 1508.76,
    '100BA':  91.44,
    '200BA':  182.88,
    '100BR':  91.44,
    '200BR':  182.88,
    '100FL':  91.44,
    '200FL':  182.88,
    '200IM':  182.88,
    '400IM':  365.76,
}

# Turn advantage per wall in seconds, by stroke
TURN_ADVANTAGE_SECONDS = {
    'FR': 1.35,
    'BA': 1.25,
    'FL': 1.40,
    'BR': 0.60,
    'IM': 1.05,
}


def get_stroke_from_event(event_code: str) -> str:
    """Extract stroke abbreviation from event code."""
    for stroke in ['BR', 'BA', 'FL', 'IM', 'FR']:
        if event_code.endswith(stroke):
            return stroke
    return 'FR'


def get_lcm_distance(event_code: str) -> float:
    """Get source distance in meters from event code."""
    for dist in [1500, 1650, 1000, 800, 400, 200, 100, 50]:
        if str(dist) in event_code:
            return float(dist)
    return 100.0


def count_walls(distance_meters: float, pool_length_meters: float) -> int:
    """Count number of walls including start push-off."""
    return max(1, round(distance_meters / pool_length_meters))


def convert_to_scy(event: str, basin: str, time_s: float) -> dict:
    """
    Wall-based conversion from LCM or SCM to SCY.

    Algorithm:
    1. Count walls in source basin
    2. Count walls in SCY target
    3. Remove wall advantages from source → free-water time
    4. Scale by distance ratio
    5. Add wall advantages for SCY target
    """
    if basin == 'SCY':
        return {
            'scy_seconds': round(time_s, 2),
            'scy_display': seconds_to_display(time_s),
            'confidence': 1.0,
            'note': 'Temps SCY direct — aucune conversion appliquée.',
        }

    stroke = get_stroke_from_event(event)
    turn_adv = TURN_ADVANTAGE_SECONDS.get(stroke, 1.0)

    if basin == 'LCM':
        source_pool = 50.0
    elif basin == 'SCM':
        source_pool = 25.0
    else:
        source_pool = 50.0

    source_distance = get_lcm_distance(event)
    scy_distance = SCY_DISTANCES_METERS.get(event, source_distance * 0.9144)
    target_pool = 25 * 0.9144  # 25 yards in meters = 22.86m

    source_walls = count_walls(source_distance, source_pool)
    target_walls = count_walls(scy_distance, target_pool)

    # Strip source walls, scale, add target walls
    free_water_time = time_s - (source_walls * turn_adv)
    distance_ratio = scy_distance / source_distance
    scaled_time = free_water_time * distance_ratio
    scy_time = scaled_time + (target_walls * turn_adv)

    confidence_map = {'FR': 0.93, 'BA': 0.91, 'FL': 0.91, 'BR': 0.89, 'IM': 0.88}
    confidence = confidence_map.get(stroke, 0.90)

    return {
        'scy_seconds': round(scy_time, 2),
        'scy_display': seconds_to_display(scy_time),
        'confidence': confidence,
        'note': (
            f'≈ conversion {basin}→SCY '
            f'({source_walls} virages → {target_walls} virages) · ±2-3%'
        ),
    }


def seconds_to_display(seconds: float) -> str:
    """Convert 62.41 → '1:02.41', 45.32 → '45.32'"""
    if seconds >= 60:
        mins = int(seconds // 60)
        secs = seconds % 60
        return f"{mins}:{secs:05.2f}"
    return f"{seconds:.2f}"


def display_to_seconds(display: str) -> float:
    """Convert '1:02.41' → 62.41, '45.32' → 45.32"""
    display = display.strip()
    if ':' in display:
        parts = display.split(':')
        return float(parts[0]) * 60 + float(parts[1])
    return float(display)
