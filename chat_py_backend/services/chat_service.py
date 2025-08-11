from database.connection import database
from model.chat import Message, ChatRoom
from datetime import datetime
from typing import List, Optional
from bson import ObjectId

class ChatService:
    def __init__(self):
        self.messages_collection = database.messages
        self.chat_rooms_collection = database.chat_rooms
        self.users_collection = database.users

    async def save_message(self, sender_email: str, receiver_email: str, content: str) -> Message:
        """Guardar un mensaje en la base de datos"""
        message_data = {
            "sender_email": sender_email,
            "receiver_email": receiver_email,
            "content": content,
            "timestamp": datetime.utcnow(),
            "is_read": False
        }
        
        result = await self.messages_collection.insert_one(message_data)
        message_data["id"] = str(result.inserted_id)
        
        # Actualizar o crear sala de chat
        await self._update_chat_room(sender_email, receiver_email, message_data)
        
        return Message(**message_data)

    async def get_chat_history(self, user1_email: str, user2_email: str, limit: int = 50) -> List[Message]:
        """Obtener historial de chat entre dos usuarios"""
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
        
        return list(reversed(messages))  # Ordenar por timestamp ascendente

    async def get_user_chat_rooms(self, user_email: str) -> List[ChatRoom]:
        """Obtener todas las salas de chat de un usuario"""
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
        """Marcar mensajes como leídos"""
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
        """Obtener número de mensajes no leídos para un usuario"""
        query = {
            "receiver_email": user_email,
            "is_read": False
        }
        
        return await self.messages_collection.count_documents(query)

    async def _update_chat_room(self, user1_email: str, user2_email: str, last_message: dict):
        """Actualizar o crear sala de chat"""
        participants = sorted([user1_email, user2_email])
        room_id = f"{participants[0]}_{participants[1]}"
        
        chat_room_data = {
            "room_id": room_id,
            "participants": participants,
            "last_message": last_message,
            "updated_at": datetime.utcnow()
        }
        
        # Buscar si ya existe la sala
        existing_room = await self.chat_rooms_collection.find_one({"room_id": room_id})
        
        if existing_room:
            # Actualizar sala existente
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
            # Crear nueva sala
            chat_room_data["created_at"] = datetime.utcnow()
            await self.chat_rooms_collection.insert_one(chat_room_data)

    async def get_all_users(self, current_user_email: str) -> List[dict]:
        """Obtener lista de todos los usuarios excepto el actual"""
        cursor = self.users_collection.find(
            {"email": {"$ne": current_user_email}},
            {"password": 0}  # Excluir contraseña
        )
        
        users = []
        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            users.append(doc)
        
        return users
