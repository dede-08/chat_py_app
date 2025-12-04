from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from routes import auth, chat_ws, chat
from config.settings import settings
from database.connection import database, client
from database.migrations import run_database_migrations
from middleware.security import (
    SecurityHeaders,
    RequestLogger,
    rate_limit_middleware,
    auth_rate_limiter,
    api_rate_limiter
)
from utils.logger import app_logger

app = FastAPI(
    title="ChatPy API",
    description="API para aplicación de chat en tiempo real",
    version="1.0.0"
)

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Middleware de seguridad
@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    return await SecurityHeaders.add_security_headers(request, call_next)

# Middleware de logging
@app.middleware("http")
async def logging_middleware(request: Request, call_next):
    return await RequestLogger.log_requests(request, call_next)

# Middleware de rate limiting para rutas de autenticación
@app.middleware("http")
async def auth_rate_limit_middleware(request: Request, call_next):
    if request.url.path.startswith("/auth"):
        return await rate_limit_middleware(request, call_next, auth_rate_limiter)
    return await call_next(request)

# Middleware de rate limiting general
@app.middleware("http")
async def api_rate_limit_middleware(request: Request, call_next):
    return await rate_limit_middleware(request, call_next, api_rate_limiter)

# Evento de inicio: inicializar base de datos y migraciones
@app.on_event("startup")
async def startup_event():
    try:
        if client is None or database is None:
            app_logger.error("No se pudo conectar a la base de datos durante el inicio")
            return
        
        # Verificar conexión
        await client.admin.command('ping')
        app_logger.info("Conexión a MongoDB verificada exitosamente")
        
        # Ejecutar migraciones
        await run_database_migrations(database)
        app_logger.info("Aplicación iniciada correctamente")
    except Exception as e:
        app_logger.error(f"Error durante el inicio de la aplicación: {e}")

# Evento de cierre: cerrar conexión a base de datos
@app.on_event("shutdown")
async def shutdown_event():
    try:
        if client:
            client.close()
            app_logger.info("Conexión a MongoDB cerrada correctamente")
    except Exception as e:
        app_logger.error(f"Error al cerrar conexión: {e}")

# Endpoint de health check
@app.get("/health")
async def health_check():
    """Endpoint para verificar el estado de la API"""
    try:
        if client is None or database is None:
            return JSONResponse(
                status_code=503,
                content={"status": "unhealthy", "database": "disconnected"}
            )
        
        # Verificar conexión a la base de datos
        await client.admin.command('ping')
        return {
            "status": "healthy",
            "database": "connected",
            "version": "1.0.0"
        }
    except Exception as e:
        app_logger.error(f"Error en health check: {e}")
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "error": str(e)}
        )

# Incluir routers
app.include_router(auth.router)
app.include_router(chat_ws.router)
app.include_router(chat.router)
