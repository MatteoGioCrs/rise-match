"""
US College Scorecard API client.
Official US Government open data API — free key at api.data.gov.
Caches responses in Redis with TTL = 180 days.
"""

import json
import hashlib
import asyncio
from typing import Optional

import httpx

from config import settings

BASE_URL = "https://api.data.gov/ed/collegescorecard/v1/schools.json"
CACHE_TTL = 180 * 24 * 3600  # 180 days in seconds

SCORECARD_FIELDS = ",".join([
    "id",
    "school.name",
    "school.city",
    "school.state",
    "school.zip",
    "school.school_url",
    "school.tuition.out_of_state",
    "latest.admissions.admission_rate.overall",
    "latest.student.size",
    "latest.programs.cip_4_digit",
    "latest.cost.tuition.out_of_state",
])

# Partial CIP code → readable category mapping
CIP_CATEGORIES: dict[str, str] = {
    "01": "Agriculture",
    "03": "Natural Resources",
    "04": "Architecture",
    "09": "Communications",
    "11": "Computer Science",
    "13": "Education",
    "14": "Engineering",
    "15": "Engineering Technology",
    "16": "Languages",
    "19": "Family & Consumer Sciences",
    "22": "Law",
    "23": "English",
    "24": "Liberal Arts",
    "25": "Library Science",
    "26": "Biology",
    "27": "Mathematics",
    "30": "Interdisciplinary Studies",
    "31": "Sport Science / Kinesiology",
    "38": "Philosophy",
    "40": "Physical Sciences",
    "42": "Psychology",
    "43": "Security & Law Enforcement",
    "44": "Public Administration",
    "45": "Social Sciences",
    "50": "Arts & Design",
    "51": "Health Sciences / Medicine",
    "52": "Business / Management",
    "54": "History",
}


def _cache_key(prefix: str, **kwargs) -> str:
    raw = json.dumps(kwargs, sort_keys=True)
    return f"scorecard:{prefix}:{hashlib.md5(raw.encode()).hexdigest()}"


async def _get_redis():
    """Lazy Redis import — returns None if Redis unavailable."""
    try:
        import redis.asyncio as aioredis
        r = aioredis.from_url(settings.redis_url, decode_responses=True)
        await r.ping()
        return r
    except Exception:
        return None


async def _cached_get(url: str, params: dict) -> Optional[dict]:
    r = await _get_redis()
    key = _cache_key("req", url=url, **params)

    if r:
        cached = await r.get(key)
        if cached:
            return json.loads(cached)

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()

    if r:
        await r.setex(key, CACHE_TTL, json.dumps(data))

    return data


def _normalise_university(result: dict) -> dict:
    """Map raw Scorecard API response to our schema."""
    latest = result.get("latest", {})
    school = result.get("school", {})
    admissions = latest.get("admissions", {})
    cost = latest.get("cost", {})
    student = latest.get("student", {})

    tuition = (
        cost.get("tuition", {}).get("out_of_state")
        or school.get("tuition", {}).get("out_of_state")
    )
    admission_rate = admissions.get("admission_rate", {}).get("overall")

    return {
        "scorecard_id": result.get("id"),
        "name": school.get("name"),
        "city": school.get("city"),
        "state": school.get("state"),
        "tuition_out": int(tuition) if tuition else None,
        "admission_rate": round(float(admission_rate), 4) if admission_rate else None,
        "campus_size": int(student.get("size")) if student.get("size") else None,
        "raw_programs": latest.get("programs", {}).get("cip_4_digit", []),
    }


async def search_university(name: str) -> dict:
    """
    Search by school name.
    Returns normalized university dict with available majors.
    """
    params = {
        "api_key": settings.college_scorecard_api_key,
        "school.name": name,
        "fields": SCORECARD_FIELDS,
        "per_page": 5,
    }
    data = await _cached_get(BASE_URL, params)
    results = data.get("results", [])
    if not results:
        return {}

    uni = _normalise_university(results[0])
    uni["available_majors"] = _parse_majors(uni.pop("raw_programs", []))
    return uni


async def get_available_majors(scorecard_id: int) -> list[dict]:
    """
    Get list of available programs/majors for a university by Scorecard ID.
    Returns [{code, title}].
    """
    params = {
        "api_key": settings.college_scorecard_api_key,
        "id": scorecard_id,
        "fields": "id,school.name,latest.programs.cip_4_digit",
    }
    data = await _cached_get(BASE_URL, params)
    results = data.get("results", [])
    if not results:
        return []

    raw_programs = results[0].get("latest", {}).get("programs", {}).get("cip_4_digit", [])
    return _parse_majors(raw_programs)


def _parse_majors(raw_programs: list) -> list[dict]:
    """Map CIP 4-digit program data to readable {code, title} list."""
    majors = []
    seen = set()
    for prog in raw_programs:
        if not isinstance(prog, dict):
            continue
        cip_code = str(prog.get("code", ""))
        title = prog.get("title") or CIP_CATEGORIES.get(cip_code[:2], f"CIP {cip_code}")
        if cip_code and cip_code not in seen:
            seen.add(cip_code)
            majors.append({"code": cip_code, "title": title})
    return majors


async def enrich_universities_batch(university_ids: list[int]) -> list[dict]:
    """
    Batch enrich multiple universities by Scorecard ID.
    Respects rate limit: 1000 req/hr → ~1 req/3.6s.
    """
    results = []
    for uni_id in university_ids:
        params = {
            "api_key": settings.college_scorecard_api_key,
            "id": uni_id,
            "fields": SCORECARD_FIELDS,
        }
        try:
            data = await _cached_get(BASE_URL, params)
            raw = data.get("results", [{}])[0]
            uni = _normalise_university(raw)
            uni["available_majors"] = _parse_majors(uni.pop("raw_programs", []))
            results.append(uni)
        except Exception as e:
            results.append({"scorecard_id": uni_id, "error": str(e)})

        await asyncio.sleep(3.6)  # stay within 1000 req/hr

    return results
