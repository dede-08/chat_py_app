from database.connection import database
from model.chat import Message, ChatRoom
from datetime import datetime
from typing import List, Optional
from bson import ObjectId
from jose import JWTError, jwt
import os

SECRET_KEY = os.getenv("JWT_SECRET")
ALGORITHM = os.getenv("JWT_ALGORITHM")

class ChatService:
    def __init__(self):
        self.messages_collection = database.messages
        self.chat_rooms_collection = database.chat_rooms
        self.users_collection = database.users

    async def save_message(self, sender_email: str, receiver_email: str, content: str) -> Message:
        #guardar un mensaje en la base de datos
        message_data = {
            "sender_email": sender_email,
            "receiver_email": receiver_email,
            "content": content,
            "timestamp": datetime.utcnow(),
            "is_read": False
        }
        
        result = await self.messages_collection.insert_one(message_data)
        message_data["id"] = str(result.inserted_id)
        
        #actualizar o crear sala de chat
        await self._update_chat_room(sender_email, receiver_email, message_data)
        
        return Message(**message_data)

    async def get_chat_history(self, user1_email: str, user2_email: str, limit: int = 50) -> List[Message]:
        #obtener historial de chat entre dos usuarios
        query = {
            "$or": [
                {"sender_email": user1_email, "receiver_email": user2_email},
                {"sender_email": user2_email, "receiver_email": user1_email}
            ]
        }
        
        cursor = self.messages_collection.find(query).sort("timestamp", -1).limit(limit)
        messages = []
        
        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            messages.append(Message(**doc))
        
        return list(reversed(messages))  #ordenar por timestamp ascendente

    async def get_user_chat_rooms(self, user_email: str) -> List[ChatRoom]:
        #obtener todas las salas de chat de un usuario
        query = {"participants": user_email}
        cursor = self.chat_rooms_collection.find(query).sort("updated_at", -1)
        
        chat_rooms = []
        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            if doc.get("last_message"):
                doc["last_message"]["id"] = str(doc["last_message"]["_id"])
            chat_rooms.append(ChatRoom(**doc))
        
        return chat_rooms

    async def mark_messages_as_read(self, sender_email: str, receiver_email: str):
        #marcar mensajes como leídos
        query = {
            "sender_email": sender_email,
            "receiver_email": receiver_email,
            "is_read": False
        }
        
        await self.messages_collection.update_many(
            query,
            {"$set": {"is_read": True}}
        )

    async def get_unread_count(self, user_email: str) -> int:
        #obtener numero de mensajes no leidos para un usuario
        query = {
            "receiver_email": user_email,
            "is_read": False
        }
        
        return await self.messages_collection.count_documents(query)

    async def _update_chat_room(self, user1_email: str, user2_email: str, last_message: dict):
        #actualizar o crear sala de chat
        participants = sorted([user1_email, user2_email])
        room_id = f"{participants[0]}_{participants[1]}"
        
        chat_room_data = {
            "room_id": room_id,
            "participants": participants,
            "last_message": last_message,
            "updated_at": datetime.utcnow()
        }
        
        #buscar si ya existe la sala
        existing_room = await self.chat_rooms_collection.find_one({"room_id": room_id})
        
        if existing_room:
            #actualizar sala existente
            await self.chat_rooms_collection.update_one(
                {"room_id": room_id},
                {
                    "$set": {
                        "last_message": last_message,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
        else:
            #crear nueva sala
            chat_room_data["created_at"] = datetime.utcnow()
            await self.chat_rooms_collection.insert_one(chat_room_data)

    async def get_all_users(self, current_user_email: str) -> list:
        #obtener lista de todos los usuarios excepto el actual
        cursor = self.users_collection.find(
            {"email": {"$ne": current_user_email}},
            {"password": 0}
        )
        users = []
        async for doc in cursor:
            doc["id"] = str(doc.get("_id", ""))
            doc.pop("_id", None)  #elimina el campo _id para evitar problemas de serialización
            users.append(doc)
        return users

    async def get_user_email_from_token(token: str):
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            return payload.get("email")
        except JWTError as e:
            print(f"Error decodificando token JWT: {e}")
            return None