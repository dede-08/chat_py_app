from pydantic import BaseModel, EmailStr, validator
from utils.password_validator import password_validator

class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str
    telephone: str

    @validator('password')
    def validate_password(cls, v):
        is_valid, errors = password_validator.validate_password(v)
        if not is_valid:
            raise ValueError(f"Contraseña inválida: {'; '.join(errors)}")
        return v

    @validator('username')
    def validate_username(cls, v):
        if len(v) < 3:
            raise ValueError("El nombre de usuario debe tener al menos 3 caracteres")
        if len(v) > 50:
            raise ValueError("El nombre de usuario no puede tener más de 50 caracteres")
        if not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError("El nombre de usuario solo puede contener letras, números, guiones y guiones bajos")
        return v

    @validator('telephone')
    def validate_telephone(cls, v):
        # Validación básica de teléfono (puedes ajustar según tu país)
        import re
        phone_pattern = re.compile(r'^\+?[\d\s\-\(\)]{7,15}$')
        if not phone_pattern.match(v):
            raise ValueError("Formato de teléfono inválido")
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    username: str
    email: EmailStr

class PasswordRequirements(BaseModel):
    min_length: int
    max_length: int
    require_uppercase: bool
    require_lowercase: bool
    require_digits: bool
    require_special_chars: bool
    special_chars: str
