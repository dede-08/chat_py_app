from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
import time
from collections import defaultdict, deque
from typing import Dict, Deque
import asyncio
from utils.logger import app_logger
from config.settings import settings

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
    def _build_csp_policy() -> str:
        """
        Construir la política de Content Security Policy (CSP).
        
        Permite recursos necesarios para el frontend:
        - Scripts desde 'self' y CDNs confiables (Bootstrap)
        - Estilos desde 'self' y Google Fonts
        - Fuentes desde Google Fonts
        - Conexiones WebSocket al mismo origen
        - Imágenes desde 'self' y data URIs
        - Conexiones fetch/XMLHttpRequest al mismo origen y API backend
        
        Returns:
            String con la política CSP completa
        """
        # Obtener el origen del frontend para permitir conexiones
        frontend_origin = settings.frontend_url
        
        # Construir lista de orígenes permitidos para conexiones
        connect_sources = ["'self'", frontend_origin]
        
        # En desarrollo, permitir conexiones WebSocket en localhost
        if "localhost" in frontend_origin or "127.0.0.1" in frontend_origin:
            connect_sources.extend([
                "ws://localhost:*",
                "wss://localhost:*",
                "ws://127.0.0.1:*",
                "wss://127.0.0.1:*"
            ])
        else:
            # En producción, permitir WebSockets al mismo origen
            # Extraer el protocolo y host del frontend_url
            if frontend_origin.startswith("https://"):
                ws_origin = frontend_origin.replace("https://", "wss://")
            elif frontend_origin.startswith("http://"):
                ws_origin = frontend_origin.replace("http://", "ws://")
            else:
                ws_origin = frontend_origin
            connect_sources.append(ws_origin)
        
        # Construir CSP policy
        csp_directives = [
            # Scripts: permitir mismo origen y CDNs confiables
            # 'unsafe-inline' y 'unsafe-eval' necesarios para Vite/React en desarrollo
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
            # Estilos: permitir mismo origen, inline (para React/Vite) y Google Fonts
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            # Fuentes: permitir Google Fonts
            "font-src 'self' https://fonts.gstatic.com data:",
            # Imágenes: permitir mismo origen, data URIs y CDNs
            "img-src 'self' data: https: blob:",
            # Conexiones: permitir mismo origen, WebSocket y API backend
            f"connect-src {' '.join(connect_sources)}",
            # Media: permitir mismo origen
            "media-src 'self'",
            # Objetos embebidos: deshabilitar por seguridad
            "object-src 'none'",
            # Base URI: solo mismo origen
            "base-uri 'self'",
            # Form actions: solo mismo origen
            "form-action 'self'",
            # Frame ancestors: deshabilitar para prevenir clickjacking
            "frame-ancestors 'none'",
            # Upgrade insecure requests en producción (comentado para desarrollo)
            # "upgrade-insecure-requests",
        ]
        
        return "; ".join(csp_directives)
    
    @staticmethod
    async def add_security_headers(request: Request, call_next):
        """
        Middleware para agregar headers de seguridad HTTP.
        
        Incluye:
        - X-Content-Type-Options: previene MIME type sniffing
        - X-Frame-Options: previene clickjacking
        - X-XSS-Protection: protección básica XSS (legacy)
        - Referrer-Policy: controla información de referrer
        - Content-Security-Policy: política de seguridad de contenido
        """
        response = await call_next(request)
        
        # Headers de seguridad
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Content Security Policy - construido dinámicamente
        csp_policy = SecurityHeaders._build_csp_policy()
        response.headers["Content-Security-Policy"] = csp_policy
        
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
