from motor.motor_asyncio import AsyncIOMotorClient
from config.settings import settings
from utils.logger import db_logger
from typing import Optional

_client: Optional[AsyncIOMotorClient] = None
_database = None
_initialized = False

users_collection = None
messages_collection = None
refresh_tokens_collection = None

async def get_database():
    """Obtener la instancia de la base de datos, inicializando si es necesario."""
    global _client, _database, _initialized
    global users_collection, messages_collection, refresh_tokens_collection

    if _initialized:
        return _database

    try:
        _client = AsyncIOMotorClient(
            settings.mongo_url,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000
        )
        await _client.admin.command('ping')
        _database = _client[settings.db_name]
        users_collection = _database["users"]
        messages_collection = _database["messages"]
        refresh_tokens_collection = _database["refresh_tokens"]
        _initialized = True
        db_logger.info("Conexion a la base de datos establecida con exito")
        return _database
    except Exception as e:
        db_logger.error(f"No se pudo conectar a la base de datos: {e}")
        _client = None
        _database = None
        users_collection = None
        messages_collection = None
        refresh_tokens_collection = None
        raise

def get_client():
    """Obtener el cliente de MongoDB (puede ser None si no inicializado)."""
    return _client

async def close_database():
    """Cerrar la conexion a la base de datos."""
    global _client, _database, _initialized
    global users_collection, messages_collection, refresh_tokens_collection

    if _client:
        _client.close()
    _client = None
    _database = None
    _initialized = False
    users_collection = None
    messages_collection = None
    refresh_tokens_collection = None
    db_logger.info("Conexion a MongoDB cerrada")
