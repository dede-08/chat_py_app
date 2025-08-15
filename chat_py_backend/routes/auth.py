from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from model.user import User
from schemas.user_schema import UserRegister, UserLogin, PasswordRequirements
from database.connection import users_collection
from passlib.context import CryptContext
from utils.jwt_handler import create_access_token
from utils.jwt_bearer import JWTBearer
from utils.password_validator import password_validator

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
async def register(user: UserRegister):
    # La validación de contraseña ya se hace en el esquema
    existing_user = await users_collection.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="El email ya ha sido registrado")

    # Verificar si el username ya existe
    existing_username = await users_collection.find_one({"username": user.username})
    if existing_username:
        raise HTTPException(status_code=400, detail="El nombre de usuario ya está en uso")

    hashed_password = pwd_context.hash(user.password)
    user_dict = user.dict()
    user_dict["password"] = hashed_password

    await users_collection.insert_one(user_dict)
    return {"message": "Usuario registrado correctamente"}

@router.post("/login")
async def login(user: UserLogin):
    db_user = await users_collection.find_one({"email": user.email})
    if not db_user:
        raise HTTPException(status_code=400, detail="Credenciales inválidas")

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
    """Endpoint para logout (el token se invalidará en el frontend)"""
    return {"message": "Sesión cerrada correctamente"}
