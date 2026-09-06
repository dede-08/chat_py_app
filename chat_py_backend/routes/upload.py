import os
import uuid

from anyio import to_thread
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from config.settings import settings
from database import connection as db_conn
from utils.cookie_auth import get_current_user_email_cookie
from utils.logger import auth_logger

router = APIRouter()


def _detect_image_ext(contents: bytes) -> str | None:
    """Devuelve la extensión real del archivo según su firma (magic bytes), o None si no es una imagen válida."""
    if contents.startswith(b"\xff\xd8\xff"):
        return "jpg"
    if contents.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if contents.startswith(b"RIFF") and contents[8:12] == b"WEBP":
        return "webp"
    return None


def _write_file(filepath: str, contents: bytes) -> None:
    """Escribir el avatar en disco (síncrono, ejecutado en threadpool)."""
    os.makedirs(settings.upload_dir, exist_ok=True)
    with open(filepath, "wb") as f:
        f.write(contents)


def _delete_avatar_file(avatar_url: str | None) -> None:
    """Eliminar el archivo de avatar anterior si existe (síncrono, ejecutado en threadpool)."""
    if not avatar_url:
        return
    old_path = os.path.join(settings.upload_dir, os.path.basename(avatar_url))
    if os.path.exists(old_path):
        os.remove(old_path)


@router.post("/auth/upload-avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user_email: str = Depends(get_current_user_email_cookie),
):
    if file.content_type not in settings.allowed_image_types:
        raise HTTPException(
            status_code=400, detail="Tipo de imagen no permitido. Use JPEG, PNG o WebP"
        )

    contents = await file.read()
    if len(contents) > settings.max_upload_size:
        raise HTTPException(
            status_code=400,
            detail=f"La imagen supera el límite de {settings.max_upload_size // (1024 * 1024)}MB",
        )

    ext = _detect_image_ext(contents)
    if ext is None:
        raise HTTPException(status_code=400, detail="El archivo no es una imagen válida")

    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(settings.upload_dir, filename)

    await to_thread.run_sync(_write_file, filepath, contents)

    avatar_url = f"/uploads/avatars/{filename}"

    user = await db_conn.users_collection.find_one({"email": current_user_email})
    if not user:
        await to_thread.run_sync(os.remove, filepath)
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    await to_thread.run_sync(_delete_avatar_file, user.get("avatar_url"))

    await db_conn.users_collection.update_one(
        {"email": current_user_email},
        {"$set": {"avatar_url": avatar_url}},
    )

    auth_logger.info(f"Avatar actualizado para {current_user_email}: {avatar_url}")
    return {"avatar_url": avatar_url}


@router.delete("/auth/upload-avatar")
async def delete_avatar(
    current_user_email: str = Depends(get_current_user_email_cookie),
):
    user = await db_conn.users_collection.find_one({"email": current_user_email})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    await to_thread.run_sync(_delete_avatar_file, user.get("avatar_url"))

    await db_conn.users_collection.update_one(
        {"email": current_user_email},
        {"$set": {"avatar_url": None}},
    )

    auth_logger.info(f"Avatar eliminado para {current_user_email}")
    return {"avatar_url": None}
