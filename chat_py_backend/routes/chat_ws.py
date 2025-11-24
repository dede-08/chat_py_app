from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, HTTPException
from jose import JWTError, jwt
from typing import Dict, List
from dotenv import load_dotenv
import os
import json
from datetime import datetime
from services.chat_service import ChatService
import traceback

router = APIRouter()
#diccionario para mantener conexiones por usuario
connected_users: Dict[str, WebSocket] = {}
chat_service = ChatService()

load_dotenv()

SECRET_KEY = os.getenv("JWT_SECRET")
ALGORITHM = os.getenv("JWT_ALGORITHM")

async def get_user_email_from_token(token: str):
    print(f"Token recibido para decodificar: {token}")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        print(f"Payload decodificado: {payload}")
        email = payload.get("email")
        if not email:
            print("Email no encontrado en el payload")
            return None
        return email
    except JWTError as e:
        print(f"Token inválido: {e}")
        return None

@router.websocket("/ws/chat")
async def chat_endpoint(websocket: WebSocket, token: str = Query(None)):
    print(f"Intento de conexión WebSocket con token: {token}")
    if not token:
        print("Conexión WebSocket cerrada: No se proporcionó token")
        await websocket.close(code=1008, reason="Token no proporcionado")
        return

    user_email = await get_user_email_from_token(token)
    if not user_email:
        print(f"Conexión WebSocket cerrada: Token inválido o email no encontrado para el token: {token}")
        await websocket.close(code=1008, reason="Token inválido")
        return
    
    print(f"Usuario {user_email} autenticado correctamente.")

    await websocket.accept()
    connected_users[user_email] = websocket
    
    #notificar a otros usuarios que este usuario esta online
    await broadcast_user_status(user_email, True)
    
    try:
        while True:
            data = await websocket.receive_text()
            print("Mensaje recibido en WebSocket:", data)
            message_data = json.loads(data)
            message_type = message_data.get("type", "message")
            if message_type == "message":
                await handle_private_message(user_email, message_data)
            elif message_type == "typing":
                await handle_typing_indicator(user_email, message_data)
            elif message_type == "read":
                await handle_read_receipt(user_email, message_data)
            elif message_type == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
                continue  #solo para mantener la conexion
                
    except WebSocketDisconnect:
        if user_email in connected_users:
            del connected_users[user_email]
        #notificar que el usuario esta offline
        await broadcast_user_status(user_email, False)
    except Exception as e:
        print(f"Error en WebSocket:", e)
        traceback.print_exc()
        if user_email in connected_users:
            del connected_users[user_email]
        await broadcast_user_status(user_email, False)
        print("Cerrando conexión WebSocket debido a error.")

async def handle_private_message(sender_email: str, message_data: dict):
    #manejar mensaje privado entre usuarios
    receiver_email = message_data.get("receiver_email")
    content = message_data.get("content")
    
    if not receiver_email or not content:
        return
    
    #guardar mensaje en la base de datos
    saved_message = await chat_service.save_message(sender_email, receiver_email, content)
    
    #preparar mensaje para enviar
    message_to_send = {
        "type": "message",
        "id": saved_message.id,
        "sender_email": sender_email,
        "receiver_email": receiver_email,
        "content": content,
        "timestamp": saved_message.timestamp.isoformat(),
        "is_read": False
    }
    
    #enviar al destinatario si esta en linea
    if receiver_email in connected_users:
        await connected_users[receiver_email].send_text(json.dumps(message_to_send))
    
    #enviar confirmación al remitente
    if sender_email in connected_users:
        confirmation = {
            "type": "message_sent",
            "message_id": saved_message.id,
            "timestamp": saved_message.timestamp.isoformat()
        }
        await connected_users[sender_email].send_text(json.dumps(confirmation))

async def handle_typing_indicator(sender_email: str, message_data: dict):
    #manejar indicador de escritura
    receiver_email = message_data.get("receiver_email")
    is_typing = message_data.get("is_typing", False)
    
    if receiver_email and receiver_email in connected_users:
        typing_data = {
            "type": "typing",
            "sender_email": sender_email,
            "is_typing": is_typing
        }
        await connected_users[receiver_email].send_text(json.dumps(typing_data))

async def handle_read_receipt(user_email: str, message_data: dict):
    #manejar confirmacion de lectura
    sender_email = message_data.get("sender_email")
    
    if sender_email:
        #marcar mensajes como leidos en la base de datos
        await chat_service.mark_messages_as_read(sender_email, user_email)
        
        #notificar al remitente
        if sender_email in connected_users:
            read_data = {
                "type": "read_receipt",
                "reader_email": user_email,
                "timestamp": datetime.utcnow().isoformat()
            }
            await connected_users[sender_email].send_text(json.dumps(read_data))

async def broadcast_user_status(user_email: str, is_online: bool):
    #notificar a todos los usuarios conectados sobre el estado de un usuario
    status_data = {
        "type": "user_status",
        "user_email": user_email,
        "is_online": is_online,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    for email, websocket in list(connected_users.items()):
        if email != user_email:  #no enviar a mismo usuario
            try:
                await websocket.send_text(json.dumps(status_data))
            except Exception as e:
                print(f"Error al transmitir el estado a {email}: {e}")
                #si hay error, remover la conexion
                if email in connected_users:
                    del connected_users[email]
