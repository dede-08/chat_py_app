from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator, EmailStr
from typing import List

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)

    # Base de datos
    mongo_url: str = "mongodb://localhost:27017"
    db_name: str = "chatpydb"
    
    # JWT
    jwt_secret: str
    jwt_expire_minutes: int = 60
    jwt_algorithm: str = "HS256"
    
    # Refresh Token
    refresh_token_expire_days: int = 7  # 7 días de expiración para refresh tokens
    
    # CORS
    # Valores por defecto solo para desarrollo local
    frontend_url: str = "http://localhost:5173"
    allowed_origins: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173", 
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "null"  # Para file:// protocol
    ]
    
    # Servidor
    host: str = "0.0.0.0"
    port: int = 8000
    
    # Logging
    log_level: str = "INFO"
    
    # Seguridad
    bcrypt_rounds: int = 12
    max_login_attempts: int = 5
    lockout_duration: int = 300  # segundos
    
    # WebSocket
    ws_heartbeat_interval: int = 30
    ws_connection_timeout: int = 60

    # Uploads
    upload_dir: str = "uploads/avatars"
    max_upload_size: int = 5 * 1024 * 1024
    allowed_image_types: List[str] = ["image/jpeg", "image/png", "image/webp"]

    # Entorno
    environment: str = "development"

    # Configuracion de correo
    mail_username: str = "[EMAIL_ADDRESS]"
    mail_password: str = "[PASSWORD]"
    mail_from: EmailStr = "[EMAIL_ADDRESS]"
    mail_port: int = 587
    mail_server: str = "smtp.gmail.com"
    mail_starttls: bool = True
    mail_ssl_tls: bool = False
    
    @field_validator("jwt_secret")
    def validate_jwt_secret(cls, v):
        if len(v) < 32:
            raise ValueError("JWT_SECRET debe tener al menos 32 caracteres")
        return v
    
    @field_validator("allowed_origins", mode="before")
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v or []
    
    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def cors_origins(self) -> List[str]:
        """Obtener origenes permitidos para CORS"""
        origins = {self.frontend_url}
        if self.allowed_origins:
            origins.update(self.allowed_origins)
        return list(origins)

# instancia global de configuracion
settings = Settings()
