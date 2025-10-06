# ChatPy Backend

Backend para la aplicación de chat en tiempo real desarrollada con FastAPI y MongoDB.

## Características

-  Autenticación JWT
- Validación robusta de contraseñas
- Chat en tiempo real con WebSockets
- Base de datos MongoDB con Motor
- Validación de datos con Pydantic
- CORS configurado
- Estructura modular y escalable

## API Endpoints

### Autenticación
- `POST /auth/register` - Registrar nuevo usuario
- `POST /auth/login` - Iniciar sesión
- `POST /auth/logout` - Cerrar sesión
- `GET /auth/protected` - Ruta protegida de ejemplo
- `GET /auth/password-requirements` - Obtener requisitos de contraseña
- `POST /auth/validate-password` - Validar contraseña

### Chat
- `GET /chat/history/{other_user_email}` - Obtener historial de chat
- `GET /chat/rooms` - Obtener salas de chat del usuario
- `GET /chat/users` - Obtener lista de usuarios
- `GET /chat/unread-count` - Obtener número de mensajes no leídos
- `POST /chat/mark-read/{sender_email}` - Marcar mensajes como leídos

### WebSocket
- `WS /ws/chat` - Conexión WebSocket para chat en tiempo real

## Validación de Contraseñas

El sistema incluye validación robusta de contraseñas con los siguientes requisitos:

- **Longitud mínima**: 8 caracteres
- **Longitud máxima**: 128 caracteres
- **Mayúsculas**: Al menos una letra mayúscula
- **Minúsculas**: Al menos una letra minúscula
- **Números**: Al menos un número
- **Caracteres especiales**: Al menos un carácter especial
- **Sin espacios**: No se permiten espacios
- **Caracteres permitidos**: Solo letras, números y caracteres especiales específicos
