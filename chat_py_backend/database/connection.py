from motor.motor_asyncio import AsyncIOMotorClient
from config.settings import settings
from utils.logger import db_logger
from typing import Optional

client: Optional[AsyncIOMotorClient] = None
database = None
users_collection = None
messages_collection = None
refresh_tokens_collection = None

def initialize_database():
    """Inicializar conexión a la base de datos"""
    global client, database, users_collection, messages_collection, refresh_tokens_collection
    
    try:
        client = AsyncIOMotorClient(
            settings.mongo_url,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000
        )
        database = client[settings.db_name]
        users_collection = database["users"]
        messages_collection = database["messages"]
        refresh_tokens_collection = database["refresh_tokens"]
        db_logger.info("Conexión a la base de datos establecida con éxito")
    except Exception as e:
        db_logger.error(f"No se pudo conectar a la base de datos: {e}")
        client = None
        database = None
        users_collection = None
        messages_collection = None
        refresh_tokens_collection = None
        raise

# Inicializar automáticamente al importar el módulo
initialize_database()
