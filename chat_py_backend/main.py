import asyncio
import os
import traceback
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from config.settings import settings
from database.connection import close_database, get_database
from database.migrations import run_database_migrations
from middleware.security import (
    RequestLogger,
    SecurityHeaders,
    api_rate_limiter,
    auth_rate_limiter,
    csrf_origin_middleware,
    rate_limit_middleware,
)
from routes import auth, chat, chat_ws, upload
from services.refresh_token_service import refresh_token_service
from utils.logger import app_logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manejador de ciclo de vida de la aplicación"""
    # startup
    try:
        db = await get_database()
        if db is None:
            app_logger.error("No se pudo conectar a la base de datos durante el inicio")
            yield
            return

        app_logger.info("Conexión a MongoDB verificada exitosamente")

        # ejecutar migraciones
        await run_database_migrations(db)

        # iniciar tarea de limpieza del rate limiter
        _track_background_task(asyncio.create_task(auth_rate_limiter.cleanup_old_entries()))
        _track_background_task(asyncio.create_task(api_rate_limiter.cleanup_old_entries()))
        app_logger.info("Tareas de limpieza de rate limiter iniciadas")

        # iniciar tarea de limpieza de refresh tokens expirados
        async def cleanup_refresh_tokens():
            """Tarea periódica para limpiar refresh tokens expirados"""
            while True:
                try:
                    await asyncio.sleep(3600)  # ejecutar cada hora
                    await refresh_token_service.cleanup_expired_tokens()
                except Exception as e:
                    app_logger.error(f"Error en limpieza de refresh tokens: {e}")
                    await asyncio.sleep(60)  # esperar 1 minuto antes de reintentar

        _track_background_task(asyncio.create_task(cleanup_refresh_tokens()))
        app_logger.info("Tarea de limpieza de refresh tokens iniciada")

        app_logger.info("Aplicación iniciada correctamente")
    except Exception as e:
        app_logger.error(f"Error durante el inicio de la aplicación: {e}")

    yield

    # shutdown
    await close_database()


app = FastAPI(
    title="ChatPy API",
    description="API para aplicación de chat en tiempo real",
    version="1.0.0",
    lifespan=lifespan,
)

# referencias a tareas en segundo plano para evitar que el GC las elimine
_background_tasks: set[asyncio.Task] = set()


def _track_background_task(task: asyncio.Task) -> None:
    """Mantener referencia a una tarea en background hasta que termine."""
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)


# configuración de CORS - debe ser el PRIMER middleware
origins = settings.cors_origins
# en desarrollo, permitir cualquier origen localhost
if not origins:
    origins = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["set-cookie"],
)


# middleware de seguridad - DESPUES de CORS
@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    return await SecurityHeaders.add_security_headers(request, call_next)


# middleware anti-CSRF - valida Origin en requests que mutan estado
@app.middleware("http")
async def csrf_middleware(request: Request, call_next):
    return await csrf_origin_middleware(request, call_next)


# middleware de logging
@app.middleware("http")
async def logging_middleware(request: Request, call_next):
    return await RequestLogger.log_requests(request, call_next)


# middleware de rate limiting para rutas de autenticacion
@app.middleware("http")
async def auth_rate_limit_middleware(request: Request, call_next):
    if request.url.path.startswith("/auth"):
        return await rate_limit_middleware(request, call_next, auth_rate_limiter)
    return await call_next(request)


# middleware de rate limiting general
@app.middleware("http")
async def api_rate_limit_middleware(request: Request, call_next):
    return await rate_limit_middleware(request, call_next, api_rate_limiter)


# endpoint de health check
@app.get("/health")
async def health_check():
    """endpoint para verificar el estado de la API"""
    try:
        db = await get_database()
        if db is None:
            return JSONResponse(
                status_code=503, content={"status": "unhealthy", "database": "disconnected"}
            )

        return {"status": "healthy", "database": "connected", "version": "1.0.0"}
    except Exception as e:
        app_logger.error(f"Error en health check: {e}")
        return JSONResponse(status_code=503, content={"status": "unhealthy", "error": str(e)})


if not settings.is_production:

    @app.get("/dev/clear-ratelimits")
    async def clear_rate_limits():
        """Limpiar rate limiters (solo para desarrollo)"""
        from middleware.security import clear_rate_limits as _clear_rate_limits

        _clear_rate_limits()
        return {"message": "Rate limits limpiados"}


# handler global de excepciones
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Manejar todas las excepciones no capturadas"""
    app_logger.error(
        f"Excepción no manejada: {type(exc).__name__} - {exc!s}\n"
        f"Path: {request.url.path}\n"
        f"Method: {request.method}\n"
        f"Traceback: {traceback.format_exc()}"
    )
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Error interno del servidor. Por favor, intente más tarde.",
            "type": "internal_server_error",
        },
    )


# handler para errores de validacion
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Manejar errores de validación de Pydantic"""
    errors = jsonable_encoder(exc.errors())
    app_logger.warning(f"Error de validación en {request.url.path}: {errors}")
    return JSONResponse(
        status_code=422,
        content={"detail": "Error de validación en los datos enviados", "errors": errors},
    )


# handler para HTTPException
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Manejar HTTPExceptions de forma consistente"""
    return JSONResponse(
        status_code=exc.status_code, content={"detail": exc.detail, "status_code": exc.status_code}
    )


# servir archivos estaticos (uploads)
# el mount debe coincidir con el prefijo que se usa en avatar_url (/uploads/avatars/{archivo}),
# no con "/uploads", o StaticFiles resuelve un directorio duplicado (uploads/avatars/avatars/...)
os.makedirs(settings.upload_dir, exist_ok=True)
app.mount("/uploads/avatars", StaticFiles(directory=settings.upload_dir), name="uploads")

# incluir routers
app.include_router(auth.router)
app.include_router(chat_ws.router)
app.include_router(chat.router)
app.include_router(upload.router)
