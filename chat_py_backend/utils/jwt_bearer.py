from fastapi import Request, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from config.settings import settings
from typing import Optional

class JWTBearer(HTTPBearer):
    def __init__(self, auto_error: bool = True):
        super(JWTBearer, self).__init__(auto_error=auto_error)

    async def __call__(self, request: Request) -> HTTPAuthorizationCredentials:
        credentials: Optional[HTTPAuthorizationCredentials] = await super(JWTBearer, self).__call__(request)
        if credentials:
            if not self.verify_jwt(credentials.credentials):
                raise HTTPException(status_code=403, detail="Token inválido o expirado")
            return credentials
        else:
            raise HTTPException(status_code=403, detail="Token no encontrado")

    def verify_jwt(self, token: str) -> bool:
        try:
            decoded_payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
            #verificar que sea un access token (no un refresh token)
            if decoded_payload.get("type") != "access":
                return False
            return True
        except JWTError:
            return False
