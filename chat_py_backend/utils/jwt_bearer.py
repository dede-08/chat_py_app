from fastapi import Request, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from config.settings import settings

class JWTBearer(HTTPBearer):
    def __init__(self, auto_error: bool = True):
        super(JWTBearer, self).__init__(auto_error=auto_error)

    async def __call__(self, request: Request):
        credentials: HTTPAuthorizationCredentials = await super().__call__(request)
        if credentials:
            if not self.verify_jwt(credentials.credentials):
                raise HTTPException(status_code=403, detail="Token inválido o expirado")
            return credentials.credentials  #devuelve el token como string
        else:
            raise HTTPException(status_code=403, detail="Token no encontrado")

    def verify_jwt(self, token: str):
        try:
            jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
            return True
        except JWTError:
            return False
