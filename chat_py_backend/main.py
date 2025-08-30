from fastapi import FastAPI
from database.connection import database
from routes import auth, chat_ws, chat
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

FRONTEND_URL = os.getenv("FRONTEND_URL")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("FRONTEND_URL:", FRONTEND_URL)

app.include_router(auth.router)

#rutas websocket para el chat
app.include_router(chat_ws.router)

#rutas HTTP para el chat
app.include_router(chat.router)
