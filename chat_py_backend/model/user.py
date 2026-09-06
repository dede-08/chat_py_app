from pydantic import BaseModel, EmailStr


class User(BaseModel):
    username: str
    email: EmailStr
    password: str
    telephone: str
    is_email_confirmed: bool = False
    email_confirmation_token: str | None = None
    avatar_url: str | None = None
