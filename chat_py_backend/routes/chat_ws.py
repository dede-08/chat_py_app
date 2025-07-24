from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from jose import JWTError, jwt
from typing import List
from dotenv import load_dotenv
import os

router = APIRouter()
connected_users: List[WebSocket] = []

load_dotenv()

SECRET_KEY = os.getenv("JWT_SECRET")
ALGORITHM = os.getenv("JWT_ALGORITHM")

async def get_user_email_from_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("email")
    except JWTError as e:
        print(f"Token inválido: {e}")
        return None

@router.websocket("/ws/chat")
async def chat_endpoint(websocket: WebSocket, token: str = Query(None)):
    if not token:
        await websocket.close(code=1008, reason="Token no proporcionado")
        return

    user_email = await get_user_email_from_token(token)
    if not user_email:
        await websocket.close(code=1008, reason="Token inválido")
        return

    await websocket.accept()
    connected_users.append(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            for connection in connected_users:
                await connection.send_text(f"{user_email}: {data}")
    except WebSocketDisconnect:
        connected_users.remove(websocket)
