from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class User(BaseModel):
    username: str
    email: EmailStr
    password: str
    telephone: str
    is_email_confirmed: bool = False
    email_confirmation_token: Optional[str] = None
