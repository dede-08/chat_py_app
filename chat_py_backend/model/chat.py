from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class Message(BaseModel):
    id: Optional[str] = None
    sender_email: str
    receiver_email: str
    content: str
    timestamp: datetime
    is_read: bool = False

class ChatRoom(BaseModel):
    id: Optional[str] = None
    participants: list[str]  #lista de emails de participantes
    last_message: Optional[Message] = None
    created_at: datetime
    updated_at: datetime
