from fastapi import Request, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("JWT_SECRET")
ALGORITHM = os.getenv("JWT_ALGORITHM")

class JWTBearer(HTTPBearer):
    def __init__(self, auto_error: bool = True):
        super(JWTBearer, self).__init__(auto_error=auto_error)

    async def __call__(self, request: Request):
        credentials: HTTPAuthorizationCredentials = await super().__call__(request)
        if credentials:
            payload = self.verify_jwt(credentials.credentials)
            if payload is None:
                raise HTTPException(status_code=403, detail="Token inválido o expirado")
            return payload  # Devolvemos los datos decodificados
        else:
            raise HTTPException(status_code=403, detail="Token no encontrado")

    def verify_jwt(self, token: str):
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            return payload  # Devuelve el contenido decodificado del token
        except JWTError:
            return None
