from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os
import logging

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL")
DB_NAME = os.getenv("DB_NAME")

try:
    client = AsyncIOMotorClient(MONGO_URL)
    database = client[DB_NAME]
    users_collection = database["users"]
    messages_collection = database["messages"]
    logging.info("Conexión a la base de datos establecida con éxito.")
except Exception as e:
    logging.error(f"No se pudo conectar a la base de datos: {e}")
    client = None
    database = None
    users_collection = None
    messages_collection = None
