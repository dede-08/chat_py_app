from pydantic import BaseSettings, validator
from typing import List
import os

class Settings(BaseSettings):
    #base de datos
    mongo_url: str = "mongodb://localhost:27017"
    db_name: str = "chatpydb"
    
    #JWT
    jwt_secret: str
    jwt_expire_minutes: int = 60
    jwt_algorithm: str = "HS256"
    
    #CORS
    frontend_url: str = "http://localhost:5173"
    allowed_origins: List[str] = []
    
    #servidor
    host: str = "0.0.0.0"
    port: int = 8000
    
    #logging
    log_level: str = "INFO"
    
    #seguridad
    bcrypt_rounds: int = 12
    max_login_attempts: int = 5
    lockout_duration: int = 300  # segundos
    
    #websocket
    ws_heartbeat_interval: int = 30
    ws_connection_timeout: int = 60
    
    @validator("jwt_secret")
    def validate_jwt_secret(cls, v):
        if len(v) < 32:
            raise ValueError("JWT_SECRET debe tener al menos 32 caracteres")
        return v
    
    @validator("allowed_origins", pre=True)
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v or []
    
    @property
    def cors_origins(self) -> List[str]:
        """Obtener orígenes permitidos para CORS"""
        origins = [self.frontend_url]
        if self.allowed_origins:
            origins.extend(self.allowed_origins)
        return list(set(origins))  # Remover duplicados
    
    class Config:
        env_file = ".env"
        case_sensitive = False

#instancia global de configuracion
settings = Settings()
