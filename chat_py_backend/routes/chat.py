from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List
from services.chat_service import ChatService
from schemas.chat_schema import MessageResponse, ChatRoomResponse, UserStatus
from utils.jwt_bearer import JWTBearer
from utils.jwt_handler import decode_access_token
from utils.logger import chat_logger
from fastapi.security import HTTPAuthorizationCredentials

router = APIRouter()
chat_service = ChatService()

async def get_current_user_email(credentials: HTTPAuthorizationCredentials = Depends(JWTBearer())):
    """
    Obtener el email del usuario actual desde el token JWT.
    
    Usa la función centralizada decode_access_token para validar el token
    y verificar que sea un access token válido (no expirado).
    
    Args:
        token: Token JWT obtenido del header Authorization
        
    Returns:
        Email del usuario autenticado
        
    Raises:
        HTTPException: Si el token es inválido, expirado o no contiene email
    """
# Usar la función centralizada que valida el tipo de token y expiración
    payload = decode_access_token(credentials.credentials)
    
    if not payload:
        chat_logger.warning("Intento de acceso con token inválido o expirado")
        raise HTTPException(status_code=401, detail="Token inválido o expirado")
    
    email = payload.get("email")
    if not email:
        chat_logger.warning("Token válido pero sin email en el payload")
        raise HTTPException(status_code=401, detail="Token inválido: email no encontrado")
    
    return email

@router.get("/chat/history/{other_user_email}", response_model=List[MessageResponse])
async def get_chat_history(
    other_user_email: str,
    limit: int = Query(50, ge=1, le=100),
    current_user_email: str = Depends(get_current_user_email)
):
    #obtener historial de chat con un usuario especifico
    messages = await chat_service.get_chat_history(current_user_email, other_user_email, limit)
    return messages

@router.get("/chat/rooms", response_model=List[ChatRoomResponse])
async def get_user_chat_rooms(current_user_email: str = Depends(get_current_user_email)):
    #obtener todas las salas de chat del usuario actual
    chat_rooms = await chat_service.get_user_chat_rooms(current_user_email)
    return chat_rooms

@router.get("/chat/users", response_model=List[dict])
async def get_all_users(
    current_user_email: str = Depends(get_current_user_email),
    limit: int = Query(100, ge=1, le=500, description="Número máximo de usuarios"),
    skip: int = Query(0, ge=0, description="Número de usuarios a saltar para paginación")
):
    """Obtener lista de todos los usuarios disponibles para chat (con paginación)"""
    users = await chat_service.get_all_users(current_user_email, limit=limit, skip=skip)
    return users

@router.get("/chat/unread-count")
async def get_unread_count(current_user_email: str = Depends(get_current_user_email)):
    #obtener numero total de mensajes no leidos
    count = await chat_service.get_unread_count(current_user_email)
    return {"unread_count": count}

@router.post("/chat/mark-read/{sender_email}")
async def mark_messages_as_read(
    sender_email: str,
    current_user_email: str = Depends(get_current_user_email)
):
    #marcar mensajes de un usuario especifico como leidos
    await chat_service.mark_messages_as_read(sender_email, current_user_email)
    return {"message": "Mensajes marcados como leídos"}
