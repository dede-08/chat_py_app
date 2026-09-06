from database import connection as db_conn
from utils.logger import auth_logger
from pymongo.errors import DuplicateKeyError
from typing import Optional, Dict, Any


class UserService:
    """Capa de acceso a datos para la colección de usuarios.

    Encapsula todas las queries a users_collection para que las rutas
    no dependan directamente de la conexión a la base de datos.
    """

    @property
    def _users(self):
        return db_conn.users_collection

    async def find_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        return await self._users.find_one({"email": email})

    async def find_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        return await self._users.find_one({"username": username})

    async def find_by_email_confirmation_token(self, token: str) -> Optional[Dict[str, Any]]:
        return await self._users.find_one({"email_confirmation_token": token})

    async def create(self, user_dict: Dict[str, Any]) -> None:
        """Insertar un usuario. Lanza DuplicateKeyError si email/username ya existen."""
        try:
            await self._users.insert_one(user_dict)
        except DuplicateKeyError:
            raise

    async def update(self, email: str, update_fields: Dict[str, Any]) -> None:
        """Actualizar campos de un usuario. Lanza DuplicateKeyError si pisa una clave única."""
        try:
            await self._users.update_one(
                {"email": email},
                {"$set": update_fields},
            )
        except DuplicateKeyError:
            raise

    async def confirm_email(self, token: str) -> Optional[Dict[str, Any]]:
        """Marcar el email como confirmado, retornando el documento actualizado si el token existe."""
        user = await self._users.find_one({"email_confirmation_token": token})
        if not user:
            return None
        await self._users.update_one(
            {"_id": user["_id"]},
            {"$set": {"is_email_confirmed": True, "email_confirmation_token": None}},
        )
        user["is_email_confirmed"] = True
        user["email_confirmation_token"] = None
        return user

    @staticmethod
    def duplicate_key_field(e: DuplicateKeyError, default: str = "campo") -> str:
        """Extraer el campo que provocó la violación de unicidad."""
        key_pattern = getattr(e, "details", {}).get("keyPattern", {})
        if "email" in key_pattern:
            return "email"
        if "username" in key_pattern:
            return "username"
        return default


user_service = UserService()