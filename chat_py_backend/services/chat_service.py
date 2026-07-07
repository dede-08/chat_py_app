from database.connection import get_database
from model.chat import Message, ChatRoom
from datetime import datetime, timezone
from typing import List, Optional
from bson import ObjectId
from utils.jwt_handler import decode_access_token
from utils.logger import chat_logger

class ChatService:
    async def _get_db(self):
        db = await get_database()
        if db is None:
            raise RuntimeError("Base de datos no inicializada. Verifique la conexión.")
        return db

    async def save_message(self, sender_email: str, receiver_email: str, content: str) -> Message:
        db = await self._get_db()
        message_data = {
            "sender_email": sender_email,
            "receiver_email": receiver_email,
            "content": content,
            "timestamp": datetime.now(timezone.utc),
            "is_read": False
        }

        result = await db.messages.insert_one(message_data)
        message_data["id"] = str(result.inserted_id)

        await self._update_chat_room(sender_email, receiver_email, message_data)

        return Message(**message_data)

    async def get_chat_history(self, user1_email: str, user2_email: str, limit: int = 50) -> List[Message]:
        db = await self._get_db()
        query = {
            "$or": [
                {"sender_email": user1_email, "receiver_email": user2_email},
                {"sender_email": user2_email, "receiver_email": user1_email}
            ]
        }

        cursor = db.messages.find(query).sort("timestamp", -1).limit(limit)
        messages = []

        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            messages.append(Message(**doc))

        return list(reversed(messages))

    async def get_user_chat_rooms(self, user_email: str) -> List[ChatRoom]:
        db = await self._get_db()
        query = {"participants": user_email}
        cursor = db.chat_rooms.find(query).sort("updated_at", -1)

        chat_rooms = []
        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            if doc.get("last_message"):
                last_msg = doc["last_message"]
                if "_id" in last_msg:
                    last_msg["id"] = str(last_msg.pop("_id"))
                elif "id" not in last_msg:
                    last_msg["id"] = ""
            chat_rooms.append(ChatRoom(**doc))

        return chat_rooms

    async def mark_messages_as_read(self, sender_email: str, receiver_email: str):
        db = await self._get_db()
        query = {
            "sender_email": sender_email,
            "receiver_email": receiver_email,
            "is_read": False
        }

        await db.messages.update_many(
            query,
            {"$set": {"is_read": True}}
        )

    async def get_unread_count(self, user_email: str) -> int:
        db = await self._get_db()
        query = {
            "receiver_email": user_email,
            "is_read": False
        }

        return await db.messages.count_documents(query)

    async def _update_chat_room(self, user1_email: str, user2_email: str, last_message: dict):
        db = await self._get_db()
        participants = sorted([user1_email, user2_email])
        room_id = f"{participants[0]}_{participants[1]}"

        chat_room_data = {
            "room_id": room_id,
            "participants": participants,
            "last_message": last_message,
            "updated_at": datetime.now(timezone.utc)
        }

        existing_room = await db.chat_rooms.find_one({"room_id": room_id})

        if existing_room:
            await db.chat_rooms.update_one(
                {"room_id": room_id},
                {
                    "$set": {
                        "last_message": last_message,
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )
        else:
            chat_room_data["created_at"] = datetime.now(timezone.utc)
            await db.chat_rooms.insert_one(chat_room_data)

    async def get_all_users(self, current_user_email: str, limit: int = 100, skip: int = 0) -> list:
        db = await self._get_db()
        if limit > 500:
            limit = 500
            chat_logger.warning(f"Límite de usuarios ajustado a 500 (solicitado: {limit})")

        cursor = db.users.find(
            {"email": {"$ne": current_user_email}},
            {"password": 0}
        ).skip(skip).limit(limit)

        users = []
        async for doc in cursor:
            doc["id"] = str(doc.get("_id", ""))
            doc.pop("_id", None)
            users.append(doc)
        return users

    @staticmethod
    async def get_user_email_from_token(token: str):
        payload = decode_access_token(token)
        if payload:
            return payload.get("email")
        return None
