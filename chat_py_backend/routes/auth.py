from fastapi import APIRouter, HTTPException, Depends, Request, Response, Body
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
from model.user import User
from schemas.user_schema import UserRegister, UserLogin, PasswordRequirements, RefreshTokenRequest
from database.connection import users_collection
from passlib.context import CryptContext
from utils.jwt_handler import (
    create_access_token, 
    create_refresh_token, 
    decode_access_token, 
    decode_refresh_token
)
from utils.jwt_bearer import JWTBearer
from utils.cookie_auth import get_current_user_email_cookie
from utils.password_validator import password_validator
from utils.email_handler import send_email
from config.settings import settings
from utils.logger import auth_logger
from services.refresh_token_service import refresh_token_service
import uuid

router = APIRouter(prefix="/auth")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

@router.get("/protected")
async def protected_route(credentials: HTTPAuthorizationCredentials = Depends(JWTBearer())):
    """Endpoint protegido para verificar autenticación"""
    try:
        payload = decode_access_token(credentials.credentials)
        if not payload:
            raise HTTPException(status_code=401, detail="Token inválido")
        return {
            "message": "Acceso autorizado",
            "user_data": payload
        }
    except Exception as e:
        auth_logger.error(f"Error en ruta protegida: {e}")
        raise HTTPException(status_code=401, detail="Error al verificar token")

@router.get("/password-requirements", response_model=PasswordRequirements)
async def get_password_requirements():
    """Obtener los requisitos de contraseña para mostrar al usuario"""
    return password_validator.get_password_requirements()

class PasswordValidationRequest(BaseModel):
    password: str

@router.post("/validate-password")
async def validate_password(request: PasswordValidationRequest):
    """Validar una contraseña sin registrarla"""
    is_valid, errors = password_validator.validate_password(request.password)
    strength = password_validator.get_password_strength(request.password)
    
    return {
        "is_valid": is_valid,
        "errors": errors,
        "strength": strength,
        "requirements": password_validator.get_password_requirements()
    }

@router.post("/register")
async def register(user: UserRegister, request: Request):
    try:
        existing_user = await users_collection.find_one({"email": user.email})
        if existing_user:
            auth_logger.warning(f"Intento de registro con email existente: {user.email}")
            raise HTTPException(status_code=400, detail="El email ya ha sido registrado")

        existing_username = await users_collection.find_one({"username": user.username})
        if existing_username:
            auth_logger.warning(f"Intento de registro con username existente: {user.username}")
            raise HTTPException(status_code=400, detail="El nombre de usuario ya está en uso")
    except HTTPException:
        raise
    except Exception as e:
        auth_logger.error(f"Error al verificar usuario existente: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")

    hashed_password = pwd_context.hash(user.password)
    confirmation_token = str(uuid.uuid4())
    
    user_dict = user.dict()
    user_dict["password"] = hashed_password
    user_dict["is_email_confirmed"] = False
    user_dict["email_confirmation_token"] = confirmation_token

    try:
        await users_collection.insert_one(user_dict)
        auth_logger.info(f"Usuario registrado exitosamente: {user.email}")
    except Exception as e:
        auth_logger.error(f"Error al insertar usuario: {e}")
        raise HTTPException(status_code=500, detail="Error al registrar usuario")

    #enviar correo de confirmación
    try:
        confirmation_url = f"{settings.frontend_url}/confirm-email/{confirmation_token}"
        email_body = f"""
            <h1>Bienvenido a ChatPy!</h1>
            <p>Gracias por registrarte. Por favor, haz clic en el siguiente enlace para confirmar tu correo electrónico:</p>
            <a href="{confirmation_url}">{confirmation_url}</a>
        """
        await send_email(
            subject="Confirma tu correo electrónico",
            recipients=[user.email],
            body=email_body
        )
        auth_logger.info(f"Correo de confirmación enviado a: {user.email}")
    except Exception as e:
        auth_logger.error(f"Error al enviar correo de confirmación: {e}")
        #no fallar el registro si falla el envío de correo, pero loguear el error

    return {"message": "Usuario registrado correctamente. Por favor, revisa tu correo para confirmar tu cuenta."}

@router.get("/confirm-email/{token}")
async def confirm_email(token: str):
    try:
        user = await users_collection.find_one({"email_confirmation_token": token})
        if not user:
            auth_logger.warning(f"Intento de confirmación con token inválido: {token[:10]}...")
            raise HTTPException(status_code=400, detail="Token de confirmación inválido o expirado.")

        await users_collection.update_one(
            {"_id": user["_id"]},
            {"$set": {"is_email_confirmed": True, "email_confirmation_token": None}}
        )
        auth_logger.info(f"Email confirmado exitosamente: {user.get('email', 'unknown')}")
        return {"message": "Correo electrónico confirmado correctamente."}
    except HTTPException:
        raise
    except Exception as e:
        auth_logger.error(f"Error al confirmar email: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.post("/login")
async def login(user: UserLogin, response: Response):
    try:
        db_user = await users_collection.find_one({"email": user.email})
        if not db_user:
            auth_logger.warning(f"Intento de login con email no registrado: {user.email}")
            raise HTTPException(status_code=400, detail="Credenciales inválidas")

        if not db_user.get("is_email_confirmed"):
            auth_logger.warning(f"Intento de login con email no confirmado: {user.email}")
            raise HTTPException(status_code=403, detail="Correo electrónico no confirmado. Por favor, revisa tu bandeja de entrada.")

        if not pwd_context.verify(user.password, db_user["password"]):
            auth_logger.warning(f"Intento de login con contraseña incorrecta: {user.email}")
            raise HTTPException(status_code=400, detail="Credenciales inválidas")

        # Crear access token y refresh token
        access_token = create_access_token({"email": db_user["email"]})
        refresh_token = create_refresh_token({"email": db_user["email"]})
        
#guardar refresh token en la base de datos
        await refresh_token_service.save_refresh_token(db_user["email"], refresh_token)
        
        auth_logger.info(f"Login exitoso: {user.email}")
        
        #configurar cookies httpOnly y seguras - MÁS PERMISIVAS PARA DESARROLLO
        response.set_cookie(
            key="access_token",
            value=access_token,
            max_age=settings.jwt_expire_minutes * 60,  #convertir a segundos
            expires=settings.jwt_expire_minutes * 60,
            path="/",
            domain=None,  # Permitir cualquier dominio en localhost
            secure=False,  #en producción usar True con HTTPS
            httponly=True,
            samesite=None  # MÁS PERMISIVO EN DESARROLLO
        )
        
        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            max_age=settings.refresh_token_expire_days * 24 * 60 * 60,  #convertir a segundos
            expires=settings.refresh_token_expire_days * 24 * 60 * 60,
            path="/",
            domain=None,  # Permitir cualquier dominio en localhost
            secure=False,  #en producción usar True con HTTPS
            httponly=True,
            samesite=None  # MÁS PERMISIVO EN DESARROLLO
        )
        
        return {
            "message": "Login exitoso",
            "email": db_user["email"],
            "username": db_user["username"]
        }
    except HTTPException:
        raise
    except Exception as e:
        auth_logger.error(f"Error durante el login: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.post("/logout")
async def logout(request: Request, response: Response):
    """endpoint para logout - invalida todos los refresh tokens del usuario y limpia cookies.
    Acepta autenticación por cookie (preferido) o Authorization header."""
    try:
        email = None
        try:
            email = await get_current_user_email_cookie(request)
        except HTTPException:
            pass
        if email:
            revoked_count = await refresh_token_service.revoke_all_user_tokens(email)
            auth_logger.info(f"Logout exitoso: {email} - {revoked_count} tokens revocados")
    except Exception as e:
        auth_logger.warning(f"Error durante logout: {e}")
    finally:
        response.delete_cookie(key="access_token", path="/")
        response.delete_cookie(key="refresh_token", path="/")
    
    return {"message": "Sesión cerrada correctamente"}

@router.post("/refresh")
async def refresh_token_endpoint(request: Request, response: Response, body: Optional[RefreshTokenRequest] = Body(None)):
    """
    endpoint para renovar access token usando refresh token.
    Acepta refresh_token en el body o en la cookie (para uso con httpOnly).
    """
    # Permitir refresh_token en cookie cuando se usa auth por cookies
    refresh_token_value = None
    if body and body.refresh_token:
        refresh_token_value = body.refresh_token
    if not refresh_token_value:
        refresh_token_value = request.cookies.get("refresh_token")
    if not refresh_token_value:
        auth_logger.warning("Intento de refresh sin token")
        raise HTTPException(status_code=401, detail="Refresh token no proporcionado")
    try:
        payload = decode_refresh_token(refresh_token_value)
        if not payload:
            auth_logger.warning("Intento de refresh con token inválido")
            raise HTTPException(status_code=401, detail="Refresh token inválido o expirado")
        
        user_email = payload.get("email")
        if not user_email:
            auth_logger.warning("Refresh token sin email en payload")
            raise HTTPException(status_code=401, detail="Refresh token inválido")
        
        #verificar que el usuario existe y está confirmado
        db_user = await users_collection.find_one({"email": user_email})
        if not db_user:
            auth_logger.warning(f"Intento de refresh con usuario inexistente: {user_email}")
            raise HTTPException(status_code=401, detail="Usuario no encontrado")
        
        if not db_user.get("is_email_confirmed"):
            auth_logger.warning(f"Intento de refresh con email no confirmado: {user_email}")
            raise HTTPException(status_code=403, detail="Correo electrónico no confirmado")
        
        #validar que el refresh token existe en la base de datos y no está revocado
        is_valid = await refresh_token_service.validate_refresh_token(
            refresh_token_value, 
            user_email
        )
        if not is_valid:
            auth_logger.warning(f"Intento de refresh con token revocado o inválido: {user_email}")
            raise HTTPException(status_code=401, detail="Refresh token inválido o revocado")
        
        #revocar el refresh token usado (rotación de tokens)
        await refresh_token_service.revoke_refresh_token(refresh_token_value, user_email)
        
        #generar nuevos tokens
        new_access_token = create_access_token({"email": user_email})
        new_refresh_token = create_refresh_token({"email": user_email})
        
        #guardar el nuevo refresh token
        await refresh_token_service.save_refresh_token(user_email, new_refresh_token)
        
        auth_logger.info(f"Tokens renovados exitosamente para: {user_email}")
        
        #actualizar cookies con nuevos tokens
        response.set_cookie(
            key="access_token",
            value=new_access_token,
            max_age=settings.jwt_expire_minutes * 60,
            expires=settings.jwt_expire_minutes * 60,
            path="/",
            domain=None,
            secure=False,  #en produccion usar True con HTTPS
            httponly=True,
            samesite="lax"
        )
        
        response.set_cookie(
            key="refresh_token",
            value=new_refresh_token,
            max_age=settings.refresh_token_expire_days * 24 * 60 * 60,
            expires=settings.refresh_token_expire_days * 24 * 60 * 60,
            path="/",
            domain=None,
            secure=False,  #en produccion usar True con HTTPS
            httponly=True,
            samesite="lax"
        )
        
        return {
            "message": "Tokens renovados exitosamente"
        }
    except HTTPException:
        raise
    except Exception as e:
        auth_logger.error(f"Error durante refresh de token: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")
