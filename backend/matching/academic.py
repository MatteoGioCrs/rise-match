"""
Module 5: Academic fit.
Combines major availability match (fuzzy) with GPA estimate vs admission selectivity.
"""

# BAC mention → estimated US GPA equivalent
GPA_ESTIMATE: dict[str, float] = {
    "TB": 3.8,   # Très Bien
    "B":  3.4,   # Bien
    "AB": 3.0,   # Assez Bien
    "P":  2.7,   # Passable
}

# Rough required GPA derived from admission rate bands
def _required_gpa(admission_rate: float | None) -> float:
    if admission_rate is None:
        return 3.0
    if admission_rate < 0.10:
        return 3.9
    if admission_rate < 0.25:
        return 3.7
    if admission_rate < 0.50:
        return 3.4
    if admission_rate < 0.75:
        return 3.0
    return 2.7


# Simple keyword normalisation for fuzzy major matching
_MAJOR_SYNONYMS: dict[str, list[str]] = {
    "biology": ["bio", "biologie", "life science", "sciences de la vie"],
    "business": ["management", "finance", "commerce", "gestion", "economics", "économie"],
    "engineering": ["ingénierie", "computer science", "informatique", "cs", "mechanical", "electrical"],
    "psychology": ["psychologie", "psych", "behavioral"],
    "communications": ["communication", "media", "journalism"],
    "sport science": ["kinesiology", "exercise science", "sports management", "staps"],
    "medicine": ["pre-med", "pre med", "health science", "santé", "nursing"],
    "law": ["droit", "legal", "pre-law"],
    "arts": ["fine arts", "design", "architecture", "arts plastiques"],
    "education": ["teaching", "pédagogie", "enseignement"],
}


def _normalise(text: str) -> str:
    return text.lower().strip()


def _fuzzy_major_match(target: str, available: list[dict]) -> bool:
    """Check if a target major keyword fuzzy-matches any available program."""
    t = _normalise(target)

    # Direct substring match on program titles
    for prog in available:
        title = _normalise(prog.get("title", ""))
        if t in title or title in t:
            return True

    # Synonym expansion
    for canonical, synonyms in _MAJOR_SYNONYMS.items():
        group = [canonical] + synonyms
        if any(s in t for s in group):
            for prog in available:
                title = _normalise(prog.get("title", ""))
                if any(s in title for s in group):
                    return True
    return False


def compute_academic_score(
    target_majors: list[str],
    bac_mention: str | None,
    available_majors: list[dict],
    admission_rate: float | None,
) -> dict:
    """
    1. Major match: fuzzy match between swimmer targets and available programs
    2. GPA fit: estimate from bac mention vs threshold derived from admission_rate
    3. Combined: 60% major match + 40% GPA fit
    Returns {score, major_match, gpa_estimated, major_note}
    Always include indicator note — never omit from UI.
    """
    # --- Major match ---
    major_match = False
    matched_major = None
    if target_majors and available_majors:
        for major in target_majors:
            if _fuzzy_major_match(major, available_majors):
                major_match = True
                matched_major = major
                break

    major_score = 90.0 if major_match else 30.0

    # --- GPA fit ---
    gpa_estimated = GPA_ESTIMATE.get(bac_mention or "", 3.0)
    required_gpa = _required_gpa(admission_rate)
    gpa_gap = gpa_estimated - required_gpa

    if gpa_gap >= 0.3:
        gpa_score = 100.0
    elif gpa_gap >= 0:
        gpa_score = 80.0 + gpa_gap / 0.3 * 20
    elif gpa_gap >= -0.5:
        gpa_score = 80.0 + (gpa_gap / 0.5) * 50  # 80 → 30
    else:
        gpa_score = max(10.0, 30.0 + gpa_gap * 20)

    combined = major_score * 0.60 + gpa_score * 0.40

    note = (
        f"GPA estimé {gpa_estimated:.1f} (mention {bac_mention or 'inconnue'}) "
        f"vs seuil estimé {required_gpa:.1f}. "
    )
    if major_match:
        note += f"Filière «{matched_major}» disponible."
    else:
        note += "Aucune filière cible trouvée dans le catalogue — indicateur approximatif."

    return {
        "score": round(min(combined, 100.0), 2),
        "major_match": major_match,
        "matched_major": matched_major,
        "gpa_estimated": gpa_estimated,
        "gpa_required_est": required_gpa,
        "major_note": note,
    }
