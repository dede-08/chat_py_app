from database.connection import refresh_tokens_collection
from datetime import datetime, timedelta
from config.settings import settings
from utils.logger import auth_logger
from typing import Optional
import secrets

class RefreshTokenService:
    """Servicio para manejar refresh tokens en la base de datos"""
    
    @staticmethod
    async def save_refresh_token(user_email: str, refresh_token: str) -> str:
        """
        Guardar refresh token en la base de datos
        
        Args:
            user_email: Email del usuario
            refresh_token: Token JWT de refresh
            
        Returns:
            ID del refresh token guardado
        """
        token_id = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days)
        
        token_data = {
            "token_id": token_id,
            "user_email": user_email,
            "refresh_token": refresh_token,
            "created_at": datetime.utcnow(),
            "expires_at": expires_at,
            "is_revoked": False
        }
        
        try:
            await refresh_tokens_collection.insert_one(token_data)
            auth_logger.debug(f"Refresh token guardado para usuario: {user_email}")
            return token_id
        except Exception as e:
            auth_logger.error(f"Error al guardar refresh token: {e}")
            raise
    
    @staticmethod
    async def validate_refresh_token(refresh_token: str, user_email: str) -> bool:
        """
        Validar que un refresh token existe y no está revocado
        
        Args:
            refresh_token: Token JWT de refresh
            user_email: Email del usuario
            
        Returns:
            True si el token es válido, False en caso contrario
        """
        try:
            token_doc = await refresh_tokens_collection.find_one({
                "refresh_token": refresh_token,
                "user_email": user_email,
                "is_revoked": False
            })
            
            if not token_doc:
                return False
            
            # Verificar si el token ha expirado
            if token_doc.get("expires_at") < datetime.utcnow():
                # Marcar como revocado si está expirado
                await refresh_tokens_collection.update_one(
                    {"_id": token_doc["_id"]},
                    {"$set": {"is_revoked": True}}
                )
                return False
            
            return True
        except Exception as e:
            auth_logger.error(f"Error al validar refresh token: {e}")
            return False
    
    @staticmethod
    async def revoke_refresh_token(refresh_token: str, user_email: str) -> bool:
        """
        Revocar un refresh token específico
        
        Args:
            refresh_token: Token JWT de refresh
            user_email: Email del usuario
            
        Returns:
            True si se revocó exitosamente, False en caso contrario
        """
        try:
            result = await refresh_tokens_collection.update_one(
                {
                    "refresh_token": refresh_token,
                    "user_email": user_email
                },
                {"$set": {"is_revoked": True, "revoked_at": datetime.utcnow()}}
            )
            return result.modified_count > 0
        except Exception as e:
            auth_logger.error(f"Error al revocar refresh token: {e}")
            return False
    
    @staticmethod
    async def revoke_all_user_tokens(user_email: str) -> int:
        """
        Revocar todos los refresh tokens de un usuario (útil para logout)
        
        Args:
            user_email: Email del usuario
            
        Returns:
            Número de tokens revocados
        """
        try:
            result = await refresh_tokens_collection.update_many(
                {
                    "user_email": user_email,
                    "is_revoked": False
                },
                {"$set": {"is_revoked": True, "revoked_at": datetime.utcnow()}}
            )
            auth_logger.info(f"Revocados {result.modified_count} refresh tokens para usuario: {user_email}")
            return result.modified_count
        except Exception as e:
            auth_logger.error(f"Error al revocar todos los tokens del usuario: {e}")
            return 0
    
    @staticmethod
    async def cleanup_expired_tokens():
        """
        Limpiar tokens expirados de la base de datos
        Debe ejecutarse periódicamente como tarea de mantenimiento
        """
        try:
            result = await refresh_tokens_collection.delete_many({
                "expires_at": {"$lt": datetime.utcnow()}
            })
            if result.deleted_count > 0:
                auth_logger.info(f"Limpiados {result.deleted_count} refresh tokens expirados")
            return result.deleted_count
        except Exception as e:
            auth_logger.error(f"Error al limpiar tokens expirados: {e}")
            return 0

# Instancia global del servicio
refresh_token_service = RefreshTokenService()

