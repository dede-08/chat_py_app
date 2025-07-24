from fastapi import FastAPI
from database.connection import database
from routes import auth, chat_ws

app = FastAPI()

#ruta de prueba
@app.get("/")
def home():
    return{"message": "API working succesfully"}

app.include_router(auth.router, prefix="/auth")

#rutas websocket
app.include_router(chat_ws.router)
