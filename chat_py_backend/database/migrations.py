from motor.motor_asyncio import AsyncIOMotorDatabase
from utils.logger import db_logger
from typing import List, Dict, Any
import asyncio

class DatabaseMigration:
    """Clase para manejar migraciones de base de datos"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.logger = db_logger
    
    async def create_indexes(self):
        """Crear índices para optimizar consultas"""
        try:
            # Índices para la colección de usuarios
            await self.db.users.create_index([
                ("email", 1)
            ], unique=True, name="idx_users_email")
            
            await self.db.users.create_index([
                ("username", 1)
            ], unique=True, name="idx_users_username")
            
            # Índices para la colección de mensajes
            await self.db.messages.create_index([
                ("sender_email", 1),
                ("receiver_email", 1),
                ("timestamp", -1)
            ], name="idx_messages_conversation")
            
            await self.db.messages.create_index([
                ("receiver_email", 1),
                ("is_read", 1)
            ], name="idx_messages_unread")
            
            await self.db.messages.create_index([
                ("timestamp", -1)
            ], name="idx_messages_timestamp")
            
            # Índices para salas de chat
            await self.db.chat_rooms.create_index([
                ("participants", 1)
            ], name="idx_chatrooms_participants")
            
            await self.db.chat_rooms.create_index([
                ("room_id", 1)
            ], unique=True, name="idx_chatrooms_room_id")
            
            await self.db.chat_rooms.create_index([
                ("updated_at", -1)
            ], name="idx_chatrooms_updated")
            
            self.logger.info("Índices creados exitosamente")
            
        except Exception as e:
            self.logger.error(f"Error al crear índices: {str(e)}")
            raise
    
    async def setup_ttl_indexes(self):
        """Configurar índices TTL para limpieza automática"""
        try:
            # TTL para mensajes antiguos (opcional - 1 año)
            await self.db.messages.create_index([
                ("timestamp", 1)
            ], expireAfterSeconds=31536000, name="idx_messages_ttl")  # 365 días
            
            # TTL para logs de conexión (si se implementa)
            await self.db.connection_logs.create_index([
                ("timestamp", 1)
            ], expireAfterSeconds=604800, name="idx_connection_logs_ttl")  # 7 días
            
            self.logger.info("Índices TTL configurados exitosamente")
            
        except Exception as e:
            self.logger.warning(f"No se pudieron configurar índices TTL: {str(e)}")
    
    async def run_migrations(self):
        """Ejecutar todas las migraciones"""
        self.logger.info("Iniciando migraciones de base de datos...")
        
        migration_tasks = [
            self.create_indexes(),
            self.setup_ttl_indexes()
        ]
        
        await asyncio.gather(*migration_tasks, return_exceptions=True)
        
        self.logger.info("Migraciones completadas")

async def run_database_migrations(db: AsyncIOMotorDatabase):
    """Función principal para ejecutar migraciones"""
    migration = DatabaseMigration(db)
    await migration.run_migrations()
