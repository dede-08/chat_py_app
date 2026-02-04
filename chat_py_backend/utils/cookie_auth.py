from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from utils.jwt_handler import decode_access_token
from utils.logger import app_logger
from typing import Optional

class CookieAuth:
    """
    manejo de autenticacion via cookies para endpoints protegidos.
    prioriza cookies sobre Authorization header para mayor seguridad.
    """
    
    def __init__(self, auto_error: bool = True):
        self.auto_error = auto_error

    async def __call__(self, request: Request) -> str:
        #primero intentar obtener token de cookies (metodo preferido)
        access_token = request.cookies.get("access_token")
        
        if access_token:
            payload = decode_access_token(access_token)
            if payload and payload.get("email"):
                return payload["email"]
        
        #fallback a Authorization header (para transicion)
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            payload = decode_access_token(token)
            if payload and payload.get("email"):
                return payload["email"]
        
        if self.auto_error:
            app_logger.warning(f"Acceso denegado: no se encontró token válido - IP: {request.client.host if request.client else 'unknown'}")
            raise HTTPException(
                status_code=403, 
                detail="Autenticación requerida"
            )
        raise HTTPException(status_code=403, detail="Autenticación requerida")

async def get_current_user_email_cookie(request: Request) -> str:
    """
    dependency function para obtener el email del usuario desde cookies.    
    reemplaza al antiguo JWTBearer para endpoints del chat.
    """
    auth = CookieAuth()
    return await auth.__call__(request)

#para compatibilidad con codigo existente.
async def get_current_user_email(credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())):
    """
    metodo legacy para compatibilidad - usa Authorization header.
    se recomienda usar get_current_user_email_cookie para nuevos endpoints
    """
    if not credentials:
        raise HTTPException(status_code=403, detail="Token no encontrado")
    
    payload = decode_access_token(credentials.credentials)
    if not payload:
        app_logger.warning("Intento de acceso con token inválido o expirado")
        raise HTTPException(status_code=401, detail="Token inválido o expirado")
    
    email = payload.get("email")
    if not email:
        app_logger.warning("Token válido pero sin email en el payload")
        raise HTTPException(status_code=401, detail="Token inválido: email no encontrado")
    
    return email