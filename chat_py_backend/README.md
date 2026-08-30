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
