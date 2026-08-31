# ChatPy - Aplicación de chat en tiempo real

Aplicación de chat construida con **FastAPI** (backend) y **React + Vite** (frontend), con mensajería en tiempo real vía WebSockets y persistencia en MongoDB.

## Requisitos

- Python 3.11+
- Node.js 18+
- MongoDB (local o remoto)

## Inicio rápido

### 1. Backend

```bash
cd chat_py_backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Linux/macOS
pip install -r requirements.txt
copy .env.example .env         # Windows — editar JWT_SECRET y correo SMTP
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Frontend

```bash
cd chat_py_frontend
npm install
copy .env.example .env         # Dejar VITE_* vacío para usar el proxy de Vite
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173). El proxy de Vite redirige `/auth`, `/chat`, `/ws` y `/uploads` al backend en el puerto 8000.

### 3. Con Docker (opcional)

```bash
# Desde la raíz del proyecto
docker compose up --build
```

Servicios: MongoDB (`27017`), backend (`8000`), frontend (`5173`).

## Características

### Chat
- Chats privados entre usuarios
- Mensajes en tiempo real (WebSockets)
- Historial persistido en MongoDB
- Indicadores online/offline, escritura y lectura

### Autenticación
- JWT en cookies httpOnly con refresh token rotation
- Confirmación de email al registrarse y al cambiar el correo
- Validación robusta de contraseñas

### Seguridad
- Rate limiting en rutas de auth y API
- Headers de seguridad (CSP, HSTS en producción)
- Sanitización de mensajes e inputs

## Estructura del proyecto

```
chat_py_app/
├── chat_py_backend/     # API FastAPI + WebSockets
├── chat_py_frontend/    # SPA React + TypeScript
└── README.md
```

## Variables de entorno

Ver plantillas en:
- `chat_py_backend/.env.example`
- `chat_py_frontend/.env.example`

## Scripts útiles

| Comando | Ubicación | Descripción |
|---------|-----------|-------------|
| `uvicorn main:app --reload` | backend | Servidor de desarrollo |
| `npm run dev` | frontend | Dev server con proxy |
| `npm run build` | frontend | Build de producción |
| `npm run type-check` | frontend | Verificación TypeScript |
| `npm run lint` | frontend | ESLint |
| `python -m pytest` | backend | Tests (requiere `pip install -r requirements-dev.txt`) |
| `docker compose up` | raíz | Stack completo con MongoDB |

## Documentación adicional

- [Backend README](chat_py_backend/README.md) — endpoints de la API
- [Frontend README](chat_py_frontend/README.md) — detalles del cliente
