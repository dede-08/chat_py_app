import os
import uuid
import imghdr
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from database import connection as db_conn
from utils.cookie_auth import get_current_user_email_cookie
from config.settings import settings
from utils.logger import auth_logger

router = APIRouter()


@router.post("/auth/upload-avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user_email: str = Depends(get_current_user_email_cookie),
):
    if file.content_type not in settings.allowed_image_types:
        raise HTTPException(status_code=400, detail="Tipo de imagen no permitido. Use JPEG, PNG o WebP")

    contents = await file.read()
    if len(contents) > settings.max_upload_size:
        raise HTTPException(status_code=400, detail=f"La imagen supera el límite de {settings.max_upload_size // (1024*1024)}MB")

    detected = imghdr.what(None, contents)
    if detected is None:
        raise HTTPException(status_code=400, detail="El archivo no es una imagen válida")

    os.makedirs(settings.upload_dir, exist_ok=True)

    ext = {"jpeg": "jpg", "png": "png", "gif": "gif", "webp": "webp"}.get(detected, "jpg")
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(settings.upload_dir, filename)

    with open(filepath, "wb") as f:
        f.write(contents)

    avatar_url = f"/uploads/avatars/{filename}"

    user = await db_conn.users_collection.find_one({"email": current_user_email})
    if not user:
        os.remove(filepath)
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    old_avatar = user.get("avatar_url")
    if old_avatar:
        old_path = os.path.join(settings.upload_dir, os.path.basename(old_avatar))
        if os.path.exists(old_path):
            os.remove(old_path)

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

    old_avatar = user.get("avatar_url")
    if old_avatar:
        old_path = os.path.join(settings.upload_dir, os.path.basename(old_avatar))
        if os.path.exists(old_path):
            os.remove(old_path)

    await db_conn.users_collection.update_one(
        {"email": current_user_email},
        {"$set": {"avatar_url": None}},
    )

    auth_logger.info(f"Avatar eliminado para {current_user_email}")
    return {"avatar_url": None}
