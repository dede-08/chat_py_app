# ChatPy Backend

Backend para la aplicación de chat en tiempo real desarrollada con FastAPI y MongoDB.

## Características

- ✅ Autenticación JWT
- ✅ Validación robusta de contraseñas
- ✅ Chat en tiempo real con WebSockets
- ✅ Base de datos MongoDB con Motor
- ✅ Validación de datos con Pydantic
- ✅ CORS configurado
- ✅ Estructura modular y escalable

## Requisitos

- Python 3.8+
- MongoDB 4.0+
- pip

## Instalación

1. **Clonar el repositorio**
   ```bash
   git clone <url-del-repositorio>
   cd chat_py_backend
   ```

2. **Crear entorno virtual**
   ```bash
   python -m venv venv
   
   # En Windows
   venv\Scripts\activate
   
   # En macOS/Linux
   source venv/bin/activate
   ```

3. **Instalar dependencias**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configurar variables de entorno**
   ```bash
   # Copiar el archivo de ejemplo
   cp env.example .env
   
   # Editar .env con tus configuraciones
   nano .env
   ```

5. **Configurar MongoDB**
   - Instalar MongoDB en tu sistema
   - Asegurarte de que MongoDB esté corriendo en el puerto 27017
   - Crear la base de datos `chat_app` (se creará automáticamente)

6. **Ejecutar el servidor**
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

## Configuración de Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
# Configuración de Base de Datos
MONGO_URL=mongodb://localhost:27017
DB_NAME=chat_app

# Configuración de JWT
JWT_SECRET=tu_clave_secreta_muy_segura_aqui_cambiala_en_produccion
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440

# Configuración del Frontend
FRONTEND_URL=http://localhost:5173

# Configuración del Servidor
HOST=0.0.0.0
PORT=8000
```

## Estructura del Proyecto

```
chat_py_backend/
├── database/
│   └── connection.py          # Conexión a MongoDB
├── model/
│   ├── chat.py               # Modelos de chat
│   └── user.py               # Modelos de usuario
├── routes/
│   ├── auth.py               # Rutas de autenticación
│   ├── chat.py               # Rutas HTTP de chat
│   └── chat_ws.py            # WebSocket para chat en tiempo real
├── schemas/
│   ├── chat_schema.py        # Esquemas de validación de chat
│   └── user_schema.py        # Esquemas de validación de usuario
├── services/
│   └── chat_service.py       # Lógica de negocio del chat
├── utils/
│   ├── jwt_bearer.py         # Middleware de autenticación JWT
│   ├── jwt_handler.py        # Manejo de tokens JWT
│   └── password_validator.py # Validación de contraseñas
├── main.py                   # Punto de entrada de la aplicación
├── requirements.txt          # Dependencias de Python
└── README.md                # Este archivo
```

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

## Desarrollo

Para desarrollo, puedes usar:

```bash
# Ejecutar con recarga automática
uvicorn main:app --reload

# Ejecutar en modo debug
uvicorn main:app --reload --log-level debug
```

## Producción

Para producción, se recomienda:

1. Cambiar `JWT_SECRET` por una clave segura y única
2. Configurar MongoDB con autenticación
3. Usar un proxy reverso como Nginx
4. Configurar HTTPS
5. Usar un gestor de procesos como PM2 o systemd

## Licencia

Este proyecto está bajo la Licencia MIT.
