from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, HTTPException
from jose import JWTError, jwt
from typing import Dict, List, Optional
import json
import re
from datetime import datetime
from services.chat_service import ChatService
from config.settings import settings
from utils.logger import websocket_logger
from utils.jwt_handler import decode_access_token
from database.connection import users_collection
import traceback

router = APIRouter()
# Diccionario para mantener conexiones por usuario
connected_users: Dict[str, WebSocket] = {}
chat_service = ChatService()

async def validate_websocket_token(token: str) -> Optional[str]:
    """
    Validar token de WebSocket y retornar el email del usuario si es válido.
    
    Realiza las siguientes validaciones:
    1. Verifica que el token sea un access token válido (no expirado)
    2. Verifica que el usuario existe en la base de datos
    3. Verifica que el email del usuario esté confirmado
    
    Args:
        token: Token JWT a validar
        
    Returns:
        Email del usuario si el token es válido, None en caso contrario
    """
    if not token:
        websocket_logger.warning("Token no proporcionado para validación WebSocket")
        return None
    
    try:
        # Usar la función centralizada que valida el tipo de token y expiración
        payload = decode_access_token(token)
        
        if not payload:
            websocket_logger.warning("Token inválido o expirado en conexión WebSocket")
            return None
        
        email = payload.get("email")
        if not email:
            websocket_logger.warning("Email no encontrado en el payload del token")
            return None
        
        # Verificar que el usuario existe en la base de datos
        db_user = await users_collection.find_one({"email": email})
        if not db_user:
            websocket_logger.warning(f"Usuario no encontrado en BD para email: {email}")
            return None
        
        # Verificar que el email esté confirmado
        if not db_user.get("is_email_confirmed", False):
            websocket_logger.warning(f"Intento de conexión WebSocket con email no confirmado: {email}")
            return None
        
        websocket_logger.debug(f"Token validado exitosamente para usuario: {email}")
        return email
        
    except JWTError as e:
        websocket_logger.warning(f"Error JWT al validar token WebSocket: {e}")
        return None
    except Exception as e:
        websocket_logger.error(f"Error inesperado al validar token WebSocket: {e}")
        websocket_logger.debug(traceback.format_exc())
        return None

@router.websocket("/ws/chat")
async def chat_endpoint(websocket: WebSocket, token: str = Query(None)):
    """
    Endpoint WebSocket para chat en tiempo real.
    
    Requiere un token JWT válido como query parameter.
    Valida el token antes de aceptar la conexión.
    """
    # Validar que se proporcionó un token
    if not token:
        websocket_logger.warning("Intento de conexión WebSocket sin token")
        await websocket.close(
            code=1008,  # Policy violation
            reason="Token no proporcionado"
        )
        return

    # Validar token y obtener email del usuario
    user_email = await validate_websocket_token(token)
    if not user_email:
        websocket_logger.warning("Intento de conexión WebSocket con token inválido o usuario no autorizado")
        await websocket.close(
            code=1008,  # Policy violation
            reason="Token inválido, expirado o usuario no autorizado"
        )
        return
    
    # Verificar si el usuario ya tiene una conexión activa
    if user_email in connected_users:
        old_websocket = connected_users[user_email]
        try:
            websocket_logger.info(f"Cerrando conexión anterior para usuario {user_email}")
            await old_websocket.close(code=1000, reason="Nueva conexión establecida")
        except Exception as e:
            websocket_logger.warning(f"Error al cerrar conexión anterior: {e}")
        finally:
            del connected_users[user_email]
    
    # Aceptar la conexión WebSocket
    try:
        await websocket.accept()
        connected_users[user_email] = websocket
        websocket_logger.info(f"Usuario {user_email} conectado vía WebSocket exitosamente")
    except Exception as e:
        websocket_logger.error(f"Error al aceptar conexión WebSocket para {user_email}: {e}")
        await websocket.close(code=1011, reason="Error interno del servidor")
        return
    
    # Notificar a otros usuarios que este usuario está online
    await broadcast_user_status(user_email, True)
    
    try:
        while True:
            data = await websocket.receive_text()
            websocket_logger.debug(f"Mensaje recibido de {user_email}: {data[:100]}")
            try:
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
                    continue  # Solo para mantener la conexión
                else:
                    websocket_logger.warning(f"Tipo de mensaje desconocido: {message_type}")
            except json.JSONDecodeError as e:
                websocket_logger.error(f"Error al parsear JSON: {e}")
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": "Formato de mensaje inválido"
                }))
                
    except WebSocketDisconnect:
        websocket_logger.info(f"Usuario {user_email} desconectado")
        if user_email in connected_users:
            del connected_users[user_email]
        # Notificar que el usuario está offline
        await broadcast_user_status(user_email, False)
    except Exception as e:
        websocket_logger.error(f"Error en WebSocket para {user_email}: {e}")
        websocket_logger.debug(traceback.format_exc())
        if user_email in connected_users:
            del connected_users[user_email]
        await broadcast_user_status(user_email, False)

async def handle_private_message(sender_email: str, message_data: dict):
    """Manejar mensaje privado entre usuarios"""
    receiver_email = message_data.get("receiver_email")
    content = message_data.get("content")
    
    # Validaciones básicas
    if not receiver_email or not content:
        websocket_logger.warning(f"Mensaje incompleto de {sender_email}")
        return
    
    # Validar tamaño del mensaje (máximo 5000 caracteres)
    MAX_MESSAGE_LENGTH = 5000
    if len(content) > MAX_MESSAGE_LENGTH:
        websocket_logger.warning(f"Mensaje demasiado largo de {sender_email}: {len(content)} caracteres")
        if sender_email in connected_users:
            error_msg = {
                "type": "error",
                "message": f"El mensaje excede el límite de {MAX_MESSAGE_LENGTH} caracteres"
            }
            await connected_users[sender_email].send_text(json.dumps(error_msg))
        return
    
    # Sanitizar contenido básico (remover caracteres de control)
    content = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', content).strip()
    
    if not content:
        websocket_logger.warning(f"Mensaje vacío después de sanitización de {sender_email}")
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
                websocket_logger.error(f"Error al transmitir el estado a {email}: {e}")
                # Si hay error, remover la conexión
                if email in connected_users:
                    del connected_users[email]
