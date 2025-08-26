import logging
import os
from datetime import datetime
from logging.handlers import RotatingFileHandler

def setup_logger(name: str, log_file: str = None, level: str = "INFO"):
    """
    Configurar logger con formato estándar y rotación de archivos
    """
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, level.upper()))
    
    # Evitar duplicar handlers
    if logger.handlers:
        return logger
    
    # Formato del log
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    # File handler con rotación
    if log_file:
        # Crear directorio de logs si no existe
        log_dir = os.path.dirname(log_file)
        if log_dir and not os.path.exists(log_dir):
            os.makedirs(log_dir)
            
        file_handler = RotatingFileHandler(
            log_file, maxBytes=10*1024*1024, backupCount=5
        )
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    
    return logger

# Loggers para diferentes módulos
app_logger = setup_logger('chatpy.app', 'logs/app.log')
auth_logger = setup_logger('chatpy.auth', 'logs/auth.log')
chat_logger = setup_logger('chatpy.chat', 'logs/chat.log')
db_logger = setup_logger('chatpy.database', 'logs/database.log')
websocket_logger = setup_logger('chatpy.websocket', 'logs/websocket.log')
