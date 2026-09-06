from datetime import datetime

from pydantic import BaseModel


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


class ChatRoomResponse(BaseModel):
    id: str
    participants: list[str]
    last_message: MessageResponse | None = None
    created_at: datetime
    updated_at: datetime


class UserStatus(BaseModel):
    email: str
    is_online: bool
    last_seen: datetime | None = None
