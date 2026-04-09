FACTEURS_LCM_TO_SCY = {
    '50FR':   0.864,
    '100FR':  0.865,
    '200FR':  0.869,
    '400FR':  0.869,
    '500FR':  0.869,
    '1000FR': 0.869,
    '1650FR': 0.869,
    '50BA':   0.848,
    '100BA':  0.856,
    '200BA':  0.858,
    '50BR':   0.901,
    '100BR':  0.853,
    '200BR':  0.853,
    '50FL':   0.940,
    '100FL':  0.878,
    '200FL':  0.878,
    '100IM':  0.862,
    '200IM':  0.858,
    '400IM':  0.866,
}

FACTEURS_SCM_TO_SCY = 0.976

def convert_to_scy(event: str, basin: str, time_s: float) -> dict:
    if basin == 'SCY':
        return {"scy_seconds": time_s}
    if basin == 'SCM':
        return {"scy_seconds": round(time_s * FACTEURS_SCM_TO_SCY, 2)}
    if basin == 'LCM':
        factor = FACTEURS_LCM_TO_SCY.get(event)
        if not factor:
            return {"scy_seconds": None, "error": f"Event {event} non supporté"}
        return {"scy_seconds": round(time_s * factor, 2)}
    return {"scy_seconds": None, "error": f"Bassin {basin} non reconnu"}
