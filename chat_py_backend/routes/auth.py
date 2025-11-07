from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from model.user import User
from schemas.user_schema import UserRegister, UserLogin, PasswordRequirements
from database.connection import users_collection
from passlib.context import CryptContext
from utils.jwt_handler import create_access_token, decode_access_token
from utils.jwt_bearer import JWTBearer
from utils.password_validator import password_validator
from utils.email_handler import send_email
import uuid

router = APIRouter(prefix="/auth")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

@router.get("/protected", dependencies=[Depends(JWTBearer())])
async def protected_route(payload: dict = Depends(JWTBearer())):
    return {
        "message": "Acceso autorizado",
        "user_data": payload
    }

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
    existing_user = await users_collection.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="El email ya ha sido registrado")

    existing_username = await users_collection.find_one({"username": user.username})
    if existing_username:
        raise HTTPException(status_code=400, detail="El nombre de usuario ya está en uso")

    hashed_password = pwd_context.hash(user.password)
    confirmation_token = str(uuid.uuid4())
    
    user_dict = user.dict()
    user_dict["password"] = hashed_password
    user_dict["is_email_confirmed"] = False
    user_dict["email_confirmation_token"] = confirmation_token

    await users_collection.insert_one(user_dict)

    # Enviar correo de confirmación
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

    return {"message": "Usuario registrado correctamente. Por favor, revisa tu correo para confirmar tu cuenta."}

@router.get("/confirm-email/{token}")
async def confirm_email(token: str):
    user = await users_collection.find_one({"email_confirmation_token": token})
    if not user:
        raise HTTPException(status_code=400, detail="Token de confirmación inválido o expirado.")

    await users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"is_email_confirmed": True, "email_confirmation_token": None}}
    )
    return {"message": "Correo electrónico confirmado correctamente."}

@router.post("/login")
async def login(user: UserLogin):
    db_user = await users_collection.find_one({"email": user.email})
    if not db_user:
        raise HTTPException(status_code=400, detail="Credenciales inválidas")

    if not db_user.get("is_email_confirmed"):
        raise HTTPException(status_code=403, detail="Correo electrónico no confirmado. Por favor, revisa tu bandeja de entrada.")

    if not pwd_context.verify(user.password, db_user["password"]):
        raise HTTPException(status_code=400, detail="Credenciales inválidas")

    token = create_access_token({"email": db_user["email"]})
    return {
        "token": token, 
        "email": db_user["email"],
        "username": db_user["username"]
    }

@router.post("/logout", dependencies=[Depends(JWTBearer())])
async def logout():
    #endpoint para logout (el token se invalidara en el frontend)
    return {"message": "Sesión cerrada correctamente"}
