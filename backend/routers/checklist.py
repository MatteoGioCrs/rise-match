from fastapi import APIRouter, HTTPException, Header
import asyncpg, os, json
from routers.auth import verify_token
from routers.admin import verify_admin

router = APIRouter()

DEFAULT_STEPS = [
    {"id": "profile",      "label": "Profil sportif créé",                    "done": False, "category": "preparation"},
    {"id": "video",        "label": "Vidéo de compétition uploadée",           "done": False, "category": "preparation"},
    {"id": "transcripts",  "label": "Relevés de notes traduits en anglais",    "done": False, "category": "academique"},
    {"id": "toefl",        "label": "Score TOEFL / test de langue obtenu",     "done": False, "category": "academique"},
    {"id": "eligibility",  "label": "Compte NCAA Eligibility Center créé",     "done": False, "category": "administratif"},
    {"id": "naia_reg",     "label": "Inscription NAIA (si applicable)",        "done": False, "category": "administratif"},
    {"id": "targets",      "label": "Liste d'universités cibles validée",      "done": False, "category": "recherche"},
    {"id": "emails_sent",  "label": "Premiers emails coaches envoyés",         "done": False, "category": "contact"},
    {"id": "reply",        "label": "Réponse d'un coach reçue",               "done": False, "category": "contact"},
    {"id": "visit",        "label": "Visite officielle planifiée",             "done": False, "category": "contact"},
    {"id": "offer",        "label": "Offre de bourse reçue",                  "done": False, "category": "offre"},
    {"id": "committed",    "label": "Engagement signé",                        "done": False, "category": "offre"},
    {"id": "visa",         "label": "Demande de visa F-1 soumise",            "done": False, "category": "depart"},
    {"id": "housing",      "label": "Logement confirmé",                       "done": False, "category": "depart"},
    {"id": "departed",     "label": "Départ effectué ✈️",                     "done": False, "category": "depart"},
]

CATEGORY_LABELS = {
    "preparation":   "🏊 Préparation sportive",
    "academique":    "🎓 Dossier académique",
    "administratif": "📋 Administratif",
    "recherche":     "🔍 Recherche d'universités",
    "contact":       "📧 Contact coaches",
    "offre":         "🏆 Offre & engagement",
    "depart":        "✈️ Départ",
}


async def get_or_create_checklist(conn, user_id: int) -> dict:
    row = await conn.fetchrow("SELECT * FROM checklists WHERE user_id = $1", user_id)
    if not row:
        steps_json = json.dumps(DEFAULT_STEPS)
        row = await conn.fetchrow("""
            INSERT INTO checklists (user_id, steps)
            VALUES ($1, $2::jsonb)
            RETURNING *
        """, user_id, steps_json)
    return dict(row)


@router.get("/api/checklist")
async def get_checklist(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token manquant")
    payload = verify_token(authorization.replace("Bearer ", ""))
    if not payload:
        raise HTTPException(status_code=401, detail="Token invalide")

    conn = await asyncpg.connect(os.environ["DATABASE_URL"])
    try:
        cl = await get_or_create_checklist(conn, payload["user_id"])
        steps = cl["steps"]
        if isinstance(steps, str):
            steps = json.loads(steps)
        done_count = sum(1 for s in steps if s.get("done"))
        return {
            "steps": steps,
            "total": len(steps),
            "done": done_count,
            "progress_pct": round(done_count / len(steps) * 100) if steps else 0,
            "category_labels": CATEGORY_LABELS,
        }
    finally:
        await conn.close()


@router.get("/api/admin/checklist/{user_id}")
async def admin_get_checklist(user_id: int, x_admin_token: str = Header(None)):
    await verify_admin(x_admin_token)
    conn = await asyncpg.connect(os.environ["DATABASE_URL"])
    try:
        cl = await get_or_create_checklist(conn, user_id)
        steps = cl["steps"]
        if isinstance(steps, str):
            steps = json.loads(steps)
        done_count = sum(1 for s in steps if s.get("done"))
        return {
            "steps": steps,
            "total": len(steps),
            "done": done_count,
            "progress_pct": round(done_count / len(steps) * 100) if steps else 0,
            "category_labels": CATEGORY_LABELS,
            "updated_at": cl["updated_at"].isoformat() if cl.get("updated_at") else None,
        }
    finally:
        await conn.close()


@router.patch("/api/admin/checklist/{user_id}")
async def admin_update_checklist(
    user_id: int, body: dict, x_admin_token: str = Header(None)
):
    """body = { "step_id": "video", "done": true }  OR  { "steps": [...] }"""
    await verify_admin(x_admin_token)
    conn = await asyncpg.connect(os.environ["DATABASE_URL"])
    try:
        cl = await get_or_create_checklist(conn, user_id)
        steps = cl["steps"]
        if isinstance(steps, str):
            steps = json.loads(steps)

        if "steps" in body:
            steps = body["steps"]
        elif "step_id" in body:
            for step in steps:
                if step["id"] == body["step_id"]:
                    step["done"] = body.get("done", not step["done"])
                    break

        await conn.execute("""
            UPDATE checklists
            SET steps = $1::jsonb, updated_at = NOW()
            WHERE user_id = $2
        """, json.dumps(steps), user_id)

        done_count = sum(1 for s in steps if s.get("done"))
        return {
            "steps": steps,
            "done": done_count,
            "progress_pct": round(done_count / len(steps) * 100) if steps else 0,
        }
    finally:
        await conn.close()
