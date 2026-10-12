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

### 3. Con Docker (stack completo)

```bash
# Desde la raíz del proyecto. JWT_SECRET es obligatorio (mínimo 32 caracteres):
export JWT_SECRET="$(python -c 'import secrets; print(secrets.token_urlsafe(48))')"  # Linux/macOS
# $env:JWT_SECRET = ...  # PowerShell: 64+ caracteres aleatorios

docker compose up --build
```

Servicios: MongoDB (solo `127.0.0.1:27017`), backend (`8000`), frontend (`5173`).
Los datos persisten en los volúmenes `mongo_data` y `backend_uploads`.

#### Variables para producción

| Variable | Efecto |
|----------|--------|
| `JWT_SECRET` | **Obligatoria**. Sin ella el stack no arranca. Nunca uses el valor de ejemplo |
| `MAIL_USERNAME` / `MAIL_PASSWORD` | SMTP real (p. ej. Gmail + app password). Sin esto nadie recibe el correo de confirmación y **nadie puede activar su cuenta** |
| `ENVIRONMENT=production` | Activa HSTS y cookies `Secure` + `SameSite=None` |
| `FRONTEND_URL` / `ALLOWED_ORIGINS` | Dominio real (los enlaces de confirmación usan `FRONTEND_URL`; el dominio debe estar en CORS) |

> **HTTPS es requisito en producción**: con `ENVIRONMENT=production` las cookies llevan el flag
> `Secure` y el navegador las rechaza sin TLS (el login no persistiría). Expón el stack
> detrás de un proxy con certificado (Caddy, Nginx o Traefik).
>
> **Uvicorn en 1 worker**: el chat en tiempo real guarda las conexiones en memoria por
> proceso. No añadas `--workers N` o los mensajes entre procesos no se entregarán
> (ver "Arquitectura y notas" en el README del backend).

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
