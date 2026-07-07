from pydantic import BaseModel, field_serializer
from datetime import datetime, timezone
from typing import Optional

class Message(BaseModel):
    id: Optional[str] = None
    sender_email: str
    receiver_email: str
    content: str
    timestamp: datetime
    is_read: bool = False

    @field_serializer("timestamp")
    def serialize_timestamp(self, dt: datetime) -> str:
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()

class ChatRoom(BaseModel):
    id: Optional[str] = None
    participants: list[str]  #lista de emails de participantes
    last_message: Optional[Message] = None
    created_at: datetime
    updated_at: datetime

    @field_serializer("created_at", "updated_at")
    def serialize_datetime(self, dt: datetime) -> str:
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()
