from fastapi import FastAPI
from routes import auth, chat_ws, chat
from fastapi.middleware.cors import CORSMiddleware
from config.settings import settings

app = FastAPI()

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

app.include_router(auth.router)

# Rutas websocket para el chat
app.include_router(chat_ws.router)

# Rutas HTTP para el chat
app.include_router(chat.router)
