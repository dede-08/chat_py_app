from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from config.settings import settings
from typing import List
from utils.logger import app_logger

conf = ConnectionConfig(
    MAIL_USERNAME=settings.mail_username,
    MAIL_PASSWORD=settings.mail_password,
    MAIL_FROM=settings.mail_from,
    MAIL_PORT=settings.mail_port,
    MAIL_SERVER=settings.mail_server,
    MAIL_STARTTLS=settings.mail_starttls,
    MAIL_SSL_TLS=settings.mail_ssl_tls,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True
)

async def send_email(subject: str, recipients: List[str], body: str) -> bool:
    """
    Enviar correo electrónico
    
    Args:
        subject: Asunto del correo
        recipients: Lista de destinatarios
        body: Cuerpo del correo (HTML)
    
    Returns:
        bool: True si se envió correctamente, False en caso contrario
    """
    try:
        if not recipients:
            app_logger.warning("Intento de enviar correo sin destinatarios")
            return False
        
        message = MessageSchema(
            subject=subject,
            recipients=recipients,
            body=body,
            subtype="html"
        )

        fm = FastMail(conf)
        await fm.send_message(message)
        app_logger.info(f"Correo enviado exitosamente a: {', '.join(recipients)}")
        return True
    except Exception as e:
        app_logger.error(f"Error al enviar correo a {', '.join(recipients)}: {e}")
        return False
