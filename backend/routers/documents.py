import cloudinary
import cloudinary.uploader
import os
import re

import asyncpg
from fastapi import APIRouter, HTTPException, Header, UploadFile, File, Form
from routers.auth import verify_token
from routers.admin import verify_admin

router = APIRouter()

cloudinary.config(
    cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME"),
    api_key=os.environ.get("CLOUDINARY_API_KEY"),
    api_secret=os.environ.get("CLOUDINARY_API_SECRET"),
    secure=True,
)

ALLOWED_TYPES = {
    "application/pdf":  "pdf",
    "image/jpeg":       "image",
    "image/jpg":        "image",
    "image/png":        "image",
}
MAX_SIZE = 10 * 1024 * 1024  # 10 MB


def _extract_public_id(url: str) -> str | None:
    # URL format: https://res.cloudinary.com/cloud/image/upload/v123/folder/file.ext
    match = re.search(r"/upload/(?:v\d+/)?(.+)", url)
    if not match:
        return None
    return match.group(1).rsplit(".", 1)[0]


def _destroy(url: str) -> None:
    public_id = _extract_public_id(url)
    if public_id:
        try:
            cloudinary.uploader.destroy(public_id, resource_type="auto")
        except Exception:
            pass


# ── ENDPOINTS ATHLÈTE ────────────────────────────────────────────────────────

@router.post("/api/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    label: str = Form(""),
    authorization: str = Header(None),
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token manquant")
    payload = verify_token(authorization.replace("Bearer ", ""))
    if not payload:
        raise HTTPException(status_code=401, detail="Token invalide")

    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Type non autorisé (PDF, JPG, PNG)")

    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="Fichier trop lourd (max 10 MB)")

    safe_name = re.sub(r"[^\w\-.]", "_", file.filename.rsplit(".", 1)[0])
    rand_hex = int(os.urandom(4).hex(), 16)

    result = cloudinary.uploader.upload(
        content,
        folder=f"rise-match/user_{payload['user_id']}",
        resource_type="auto",
        public_id=f"{safe_name}_{rand_hex}",
    )

    file_type = ALLOWED_TYPES[file.content_type]
    conn = await asyncpg.connect(os.environ["DATABASE_URL"])
    try:
        doc_id = await conn.fetchval("""
            INSERT INTO documents
                (user_id, uploaded_by, file_name, file_url, file_type, file_size, label)
            VALUES ($1, 'athlete', $2, $3, $4, $5, $6)
            RETURNING id
        """, payload["user_id"], file.filename, result["secure_url"],
            file_type, len(content), label.strip() or None)

        return {"id": doc_id, "file_url": result["secure_url"],
                "file_name": file.filename, "file_type": file_type}
    finally:
        await conn.close()


@router.get("/api/documents")
async def get_my_documents(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token manquant")
    payload = verify_token(authorization.replace("Bearer ", ""))
    if not payload:
        raise HTTPException(status_code=401, detail="Token invalide")

    conn = await asyncpg.connect(os.environ["DATABASE_URL"])
    try:
        rows = await conn.fetch("""
            SELECT id, file_name, file_url, file_type, file_size,
                   label, uploaded_by, created_at
            FROM documents
            WHERE user_id = $1
            ORDER BY created_at DESC
        """, payload["user_id"])
        result = []
        for r in rows:
            d = dict(r)
            d["created_at"] = d["created_at"].isoformat()
            result.append(d)
        return {"documents": result}
    finally:
        await conn.close()


@router.delete("/api/documents/{doc_id}")
async def delete_document(doc_id: int, authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token manquant")
    payload = verify_token(authorization.replace("Bearer ", ""))
    if not payload:
        raise HTTPException(status_code=401, detail="Token invalide")

    conn = await asyncpg.connect(os.environ["DATABASE_URL"])
    try:
        doc = await conn.fetchrow(
            "SELECT file_url FROM documents WHERE id = $1 AND user_id = $2",
            doc_id, payload["user_id"]
        )
        if not doc:
            raise HTTPException(status_code=404, detail="Document introuvable")
        _destroy(doc["file_url"])
        await conn.execute("DELETE FROM documents WHERE id = $1", doc_id)
        return {"success": True}
    finally:
        await conn.close()


# ── ENDPOINTS ADMIN ──────────────────────────────────────────────────────────

@router.post("/api/admin/documents/{user_id}/upload")
async def admin_upload_document(
    user_id: int,
    file: UploadFile = File(...),
    label: str = Form(""),
    x_admin_token: str = Header(None),
):
    await verify_admin(x_admin_token)

    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="Fichier trop lourd (max 10 MB)")

    safe_name = re.sub(r"[^\w\-.]", "_", file.filename.rsplit(".", 1)[0])
    rand_hex = int(os.urandom(4).hex(), 16)

    result = cloudinary.uploader.upload(
        content,
        folder=f"rise-match/user_{user_id}",
        resource_type="auto",
        public_id=f"{safe_name}_{rand_hex}",
    )

    file_type = ALLOWED_TYPES.get(file.content_type, "other")
    conn = await asyncpg.connect(os.environ["DATABASE_URL"])
    try:
        user_exists = await conn.fetchval("SELECT id FROM users WHERE id = $1", user_id)
        if not user_exists:
            raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

        doc_id = await conn.fetchval("""
            INSERT INTO documents
                (user_id, uploaded_by, file_name, file_url, file_type, file_size, label)
            VALUES ($1, 'admin', $2, $3, $4, $5, $6)
            RETURNING id
        """, user_id, file.filename, result["secure_url"],
            file_type, len(content), label.strip() or None)

        return {"id": doc_id, "file_url": result["secure_url"]}
    finally:
        await conn.close()


@router.get("/api/admin/documents/{user_id}")
async def get_user_documents(user_id: int, x_admin_token: str = Header(None)):
    await verify_admin(x_admin_token)
    conn = await asyncpg.connect(os.environ["DATABASE_URL"])
    try:
        rows = await conn.fetch("""
            SELECT id, file_name, file_url, file_type, file_size,
                   label, uploaded_by, created_at
            FROM documents
            WHERE user_id = $1
            ORDER BY created_at DESC
        """, user_id)
        result = []
        for r in rows:
            d = dict(r)
            d["created_at"] = d["created_at"].isoformat()
            result.append(d)
        return {"documents": result}
    finally:
        await conn.close()


@router.delete("/api/admin/documents/{doc_id}")
async def admin_delete_document(doc_id: int, x_admin_token: str = Header(None)):
    await verify_admin(x_admin_token)
    conn = await asyncpg.connect(os.environ["DATABASE_URL"])
    try:
        doc = await conn.fetchrow(
            "SELECT file_url FROM documents WHERE id = $1", doc_id
        )
        if not doc:
            raise HTTPException(status_code=404, detail="Document introuvable")
        _destroy(doc["file_url"])
        await conn.execute("DELETE FROM documents WHERE id = $1", doc_id)
        return {"success": True}
    finally:
        await conn.close()
