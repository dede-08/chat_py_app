from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
import time
from collections import defaultdict, deque
from typing import Dict, Deque
import asyncio
from utils.logger import app_logger

class RateLimiter:

    #rate limiter basado en sliding window
    def __init__(self, max_requests: int = 100, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: Dict[str, Deque[float]] = defaultdict(deque)
        self._cleanup_task = None
        
    def is_allowed(self, client_id: str) -> bool:
        #verificar si una solicitud esta permitida
        now = time.time()
        window_start = now - self.window_seconds
        
        #limpiar solicitudes fuera de la ventana
        client_requests = self.requests[client_id]
        while client_requests and client_requests[0] < window_start:
            client_requests.popleft()
        
        #verificar limite
        if len(client_requests) >= self.max_requests:
            return False
        
        #agregar solicitud actual
        client_requests.append(now)
        return True
    
    async def cleanup_old_entries(self):
        """Limpieza periódica de entradas antiguas"""
        while True:
            try:
                now = time.time()
                window_start = now - self.window_seconds
                
                #limpiar entradas de clientes inactivos
                clients_to_remove = []
                for client_id, requests in self.requests.items():
                    while requests and requests[0] < window_start:
                        requests.popleft()
                    
                    #si no hay solicitudes recientes, marcar para eliminación
                    if not requests:
                        clients_to_remove.append(client_id)
                
                #eliminar clientes inactivos
                for client_id in clients_to_remove:
                    del self.requests[client_id]
                
                #esperar 5 minutos antes de la siguiente limpieza
                await asyncio.sleep(300)
                
            except Exception as e:
                app_logger.error(f"Error en limpieza de rate limiter: {str(e)}")
                await asyncio.sleep(60)

#instancias globales de rate limiters
auth_rate_limiter = RateLimiter(max_requests=5, window_seconds=60)  #5 intentos por minuto
api_rate_limiter = RateLimiter(max_requests=100, window_seconds=60) #100 requests por minuto
ws_rate_limiter = RateLimiter(max_requests=1000, window_seconds=60) #1000 mensajes WS por minuto

async def rate_limit_middleware(request: Request, call_next, limiter: RateLimiter = None):
    #middleware para rate limiting
    if limiter is None:
        limiter = api_rate_limiter
    
    #obtener IP del cliente
    client_ip = request.client.host
    if "x-forwarded-for" in request.headers:
        client_ip = request.headers["x-forwarded-for"].split(",")[0].strip()
    
    #verificar rate limit
    if not limiter.is_allowed(client_ip):
        app_logger.warning(f"Rate limit excedido para IP: {client_ip}")
        return JSONResponse(
            status_code=429,
            content={"detail": "Demasiadas solicitudes. Intenta más tarde."}
        )
    
    response = await call_next(request)
    return response

class SecurityHeaders:

    #middleware para agregar headers de seguridad
    @staticmethod
    async def add_security_headers(request: Request, call_next):
        response = await call_next(request)
        
        #headers de seguridad
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = "default-src 'self'"
        
        return response

class RequestLogger:
    
    #middleware para logging de solicitudes
    @staticmethod
    async def log_requests(request: Request, call_next):
        start_time = time.time()
        
        #log de solicitud entrante
        app_logger.info(f"Request: {request.method} {request.url}")
        
        try:
            response = await call_next(request)
            
            #log de respuesta
            process_time = time.time() - start_time
            app_logger.info(
                f"Response: {response.status_code} - "
                f"Time: {process_time:.2f}s - "
                f"Method: {request.method} - "
                f"Path: {request.url.path}"
            )
            
            return response
            
        except Exception as e:
            process_time = time.time() - start_time
            app_logger.error(
                f"Request failed: {str(e)} - "
                f"Time: {process_time:.2f}s - "
                f"Method: {request.method} - "
                f"Path: {request.url.path}"
            )
            raise
