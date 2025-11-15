from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List
from services.chat_service import ChatService
from schemas.chat_schema import MessageResponse, ChatRoomResponse, UserStatus
from utils.jwt_bearer import JWTBearer
from jose import JWTError, jwt
from dotenv import load_dotenv
import os

router = APIRouter()
chat_service = ChatService()

load_dotenv()
SECRET_KEY = os.getenv("JWT_SECRET")
ALGORITHM = os.getenv("JWT_ALGORITHM")

async def get_current_user_email(token: str = Depends(JWTBearer())):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("email")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido")

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
async def get_all_users(current_user_email: str = Depends(get_current_user_email)):
    #obtener lista de todos los usuarios disponibles para chat
    users = await chat_service.get_all_users(current_user_email)
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
