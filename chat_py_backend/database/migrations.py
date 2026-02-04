from motor.motor_asyncio import AsyncIOMotorDatabase
from utils.logger import db_logger
from typing import List, Dict, Any
import asyncio

class DatabaseMigration:
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.logger = db_logger
    
    async def create_indexes(self):
        """Crear índices para optimizar consultas"""
        index_definitions = [
            # Índices para usuarios
            {
                'collection': self.db.users,
                'keys': [("email", 1)],
                'options': {"unique": True, "name": "idx_users_email"}
            },
            {
                'collection': self.db.users,
                'keys': [("username", 1)],
                'options': {"unique": True, "name": "idx_users_username"}
            },
            
            # Índices para mensajes
            {
                'collection': self.db.messages,
                'keys': [("sender_email", 1), ("receiver_email", 1), ("timestamp", -1)],
                'options': {"name": "idx_messages_conversation"}
            },
            {
                'collection': self.db.messages,
                'keys': [("receiver_email", 1), ("is_read", 1)],
                'options': {"name": "idx_messages_unread"}
            },
            {
                'collection': self.db.messages,
                'keys': [("timestamp", -1)],
                'options': {"name": "idx_messages_timestamp"}
            },
            
            # Índices para chat rooms
            {
                'collection': self.db.chat_rooms,
                'keys': [("participants", 1)],
                'options': {"name": "idx_chatrooms_participants"}
            },
            {
                'collection': self.db.chat_rooms,
                'keys': [("room_id", 1)],
                'options': {"unique": True, "name": "idx_chatrooms_room_id"}
            },
            {
                'collection': self.db.chat_rooms,
                'keys': [("updated_at", -1)],
                'options': {"name": "idx_chatrooms_updated"}
            },
            
            # Índices para refresh tokens (excepto expires_at que se maneja en TTL)
            {
                'collection': self.db.refresh_tokens,
                'keys': [("user_email", 1), ("is_revoked", 1)],
                'options': {"name": "idx_refresh_tokens_user"}
            },
            {
                'collection': self.db.refresh_tokens,
                'keys': [("refresh_token", 1)],
                'options': {"unique": True, "name": "idx_refresh_tokens_token"}
            },
            {
                'collection': self.db.refresh_tokens,
                'keys': [("token_id", 1)],
                'options': {"unique": True, "name": "idx_refresh_tokens_id"}
            }
        ]
        
        created_count = 0
        skipped_count = 0
        
        for index_def in index_definitions:
            try:
                await index_def['collection'].create_index(
                    index_def['keys'], 
                    **index_def['options']
                )
                created_count += 1
                self.logger.debug(f"Índice creado: {index_def['options']['name']}")
            except Exception as e:
                error_str = str(e).lower()
                if "already exists" in error_str or "indexoptionsconflict" in error_str:
                    skipped_count += 1
                    self.logger.debug(f"Índice ya existe: {index_def['options']['name']}")
                else:
                    self.logger.error(f"Error creando índice {index_def['options']['name']}: {e}")
                    raise
        
        self.logger.info(f"Índices completados: {created_count} creados, {skipped_count} ya existían")
    
    async def setup_ttl_indexes(self):
        """Configurar índices TTL para limpieza automática"""
        try:
            # TTL para mensajes antiguos (opcional - 1 año)
            await self.db.messages.create_index([
                ("timestamp", 1)
            ], expireAfterSeconds=31536000, name="idx_messages_ttl")  # 365 días
            
            # TTL para logs de conexión (si se implementa)
            try:
                await self.db.connection_logs.create_index([
                    ("timestamp", 1)
                ], expireAfterSeconds=604800, name="idx_connection_logs_ttl")  # 7 días
            except Exception:
                pass  # La colección puede no existir
            
            # TTL para refresh tokens expirados (limpieza automática)
            await self.db.refresh_tokens.create_index([
                ("expires_at", 1)
            ], expireAfterSeconds=0, name="idx_refresh_tokens_ttl")
            
            self.logger.info("Índices TTL configurados exitosamente")
            
        except Exception as e:
            error_str = str(e).lower()
            if "already exists" in error_str or "indexoptionsconflict" in error_str:
                self.logger.info("Índices TTL ya existen")
            else:
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