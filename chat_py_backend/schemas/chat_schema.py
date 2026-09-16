from datetime import UTC, datetime

from pydantic import BaseModel, field_serializer


class MessageCreate(BaseModel):
    receiver_email: str
    content: str


class MessageResponse(BaseModel):
    id: str
    sender_email: str
    receiver_email: str
    content: str
    timestamp: datetime
    is_read: bool

    @field_serializer("timestamp")
    def serialize_timestamp(self, dt: datetime) -> str:
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=UTC)
        return dt.isoformat()


class ChatRoomResponse(BaseModel):
    id: str
    participants: list[str]
    last_message: MessageResponse | None = None
    created_at: datetime
    updated_at: datetime

    @field_serializer("created_at", "updated_at")
    def serialize_datetime(self, dt: datetime) -> str:
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=UTC)
        return dt.isoformat()


class UserStatus(BaseModel):
    email: str
    is_online: bool
    last_seen: datetime | None = None
