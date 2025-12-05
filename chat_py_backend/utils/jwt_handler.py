from jose import jwt
from datetime import datetime, timedelta
from config.settings import settings
import secrets

def create_access_token(data: dict):
    """Crear access token JWT con expiración corta"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.jwt_expire_minutes)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)

def create_refresh_token(data: dict):
    """Crear refresh token JWT con expiración larga"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)

def decode_access_token(token: str):
    """Decodificar y validar access token"""
    try:
        decoded_payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        # Verificar que sea un access token
        if decoded_payload.get("type") != "access":
            return None
        return decoded_payload
    except jwt.JWTError:
        return None

def decode_refresh_token(token: str):
    """Decodificar y validar refresh token"""
    try:
        decoded_payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        # Verificar que sea un refresh token
        if decoded_payload.get("type") != "refresh":
            return None
        return decoded_payload
    except jwt.JWTError:
        return None

def generate_refresh_token_string():
    """Generar un string aleatorio seguro para usar como ID de refresh token"""
    return secrets.token_urlsafe(32)
