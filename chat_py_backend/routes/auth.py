from fastapi import APIRouter, HTTPException, Depends
from model.user import User
from schemas.user_schema import UserRegister, UserLogin
from database.connection import users_collection
from passlib.context import CryptContext
from utils.jwt_handler import create_access_token
from utils.jwt_bearer import JWTBearer

router = APIRouter(prefix="/auth")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

@router.get("/protected", dependencies=[Depends(JWTBearer())])
async def protected_route(payload: dict = Depends(JWTBearer())):
    return {
        "message": "Acceso autorizado",
        "user_data": payload
    }

@router.post("/register")
async def register(user: UserRegister):
    existing_user = await users_collection.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="el email ya ha sido registrado")

    hashed_password = pwd_context.hash(user.password)
    user_dict = user.dict()
    user_dict["password"] = hashed_password

    await users_collection.insert_one(user_dict)
    return {"message": "usuario registrado correctamente"}

@router.post("/login")
async def login(user: UserLogin):
    db_user = await users_collection.find_one({"email": user.email})
    if not db_user:
        raise HTTPException(status_code=400, detail="credenciales invalidas")

    if not pwd_context.verify(user.password, db_user["password"]):
        raise HTTPException(status_code=400, detail="credenciales invalidas")

    token = create_access_token({"email": db_user["email"]})
    return {"token": token, "email": db_user["email"]}
