# ChatPy Backend

Backend para la aplicación de chat en tiempo real con FastAPI, MongoDB y WebSockets.

## Requisitos

- Python 3.11+
- MongoDB en ejecución

## Configuración

```bash
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
copy .env.example .env
```

Edita `.env` y configura como mínimo:
- `JWT_SECRET` — cadena aleatoria de al menos 32 caracteres
- Credenciales SMTP (`MAIL_*`) para confirmación de email

## Arranque

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Health check: `GET http://localhost:8000/health`

## Tests

```bash
pip install -r requirements-dev.txt
python -m pytest -v
```

## Características

- Autenticación JWT con cookies httpOnly y refresh token rotation
- Confirmación de email
- Chat en tiempo real con WebSockets
- Rate limiting y headers de seguridad
- Validación con Pydantic
- Índices y TTL en MongoDB

## API Endpoints

### Autenticación
- `POST /auth/register` — Registrar usuario
- `POST /auth/login` — Iniciar sesión
- `POST /auth/logout` — Cerrar sesión
- `POST /auth/refresh` — Renovar tokens
- `GET /auth/profile` — Obtener perfil
- `PUT /auth/profile` — Actualizar perfil
- `GET /auth/confirm-email/{token}` — Confirmar email
- `GET /auth/password-requirements` — Requisitos de contraseña
- `POST /auth/validate-password` — Validar contraseña
- `POST /auth/upload-avatar` — Subir avatar
- `DELETE /auth/upload-avatar` — Eliminar avatar

### Chat
- `GET /chat/history/{other_user_email}` — Historial
- `GET /chat/rooms` — Salas de chat
- `GET /chat/users` — Lista de usuarios
- `GET /chat/unread-count` — Mensajes no leídos
- `POST /chat/mark-read/{sender_email}` — Marcar como leídos

### WebSocket
- `WS /ws/chat` — Chat en tiempo real

### Otros
- `GET /health` — Estado del servicio
- `GET /dev/clear-ratelimits` — Solo en `ENVIRONMENT=development`

## Validación de contraseñas

- Mínimo 8, máximo 128 caracteres
- Al menos una mayúscula, una minúscula, un número y un carácter especial
- Sin espacios

## Arquitectura y notas

### WebSocket — ejecución single-worker

El diccionario `connected_users` en `routes/chat_ws.py` almacena las conexiones en memoria del proceso.
Si se ejecuta el servidor con más de un worker (por ejemplo `uvicorn main:app --workers 4`), cada worker
tiene su propia copia, por lo que un mensaje escrito por un usuario conectado a un worker distinto nunca
se entregará. Para desplegar con múltiples workers se necesita un broker externo (Redis, NATS) que
publique los eventos de mensaje a todos los procesos.

### Tareas de background

El lifespan crea tareas (`asyncio.create_task`) que limpien tokens expirados y rate-limiters viejos.
Si se despliega con `--workers 4` esas tareas corren en cada worker; con un broker externo basta que
un solo proceso las ejecute.

### Refresh tokens

Los refresh tokens se almacenan y buscan siempre como hash SHA-256 del JWT, nunca en claro.
