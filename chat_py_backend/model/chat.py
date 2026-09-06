from datetime import UTC, datetime

from pydantic import BaseModel, field_serializer


class Message(BaseModel):
    id: str | None = None
    sender_email: str
    receiver_email: str
    content: str
    timestamp: datetime
    is_read: bool = False

    @field_serializer("timestamp")
    def serialize_timestamp(self, dt: datetime) -> str:
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=UTC)
        return dt.isoformat()


class ChatRoom(BaseModel):
    id: str | None = None
    participants: list[str]  # lista de emails de participantes
    last_message: Message | None = None
    created_at: datetime
    updated_at: datetime

    @field_serializer("created_at", "updated_at")
    def serialize_datetime(self, dt: datetime) -> str:
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=UTC)
        return dt.isoformat()
