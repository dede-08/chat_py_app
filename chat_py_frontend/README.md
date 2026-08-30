# ChatPy Frontend

Cliente web de ChatPy: React 19, TypeScript, Vite y Tailwind CSS.

## Requisitos

- Node.js 18+
- Backend corriendo en `http://localhost:8000`

## Configuración

```bash
npm install
copy .env.example .env
```

Para desarrollo local, deja `VITE_API_URL` y `VITE_WS_URL` vacíos. Vite proxy redirige las peticiones al backend.

## Scripts

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Servidor de desarrollo (puerto 5173) |
| `npm run build` | Compilar para producción |
| `npm run preview` | Previsualizar build |
| `npm run type-check` | Verificar tipos TypeScript |
| `npm run lint` | ESLint (JS/TS/TSX) |

## Estructura

```
src/
├── components/    # UI reutilizable
├── context/       # Estado global del chat
├── pages/         # Rutas (login, chat, perfil…)
├── services/      # API, WebSocket, auth
├── types/         # Tipos TypeScript
└── utils/         # Validadores, sanitización, errores
```

## Proxy de desarrollo

Configurado en `vite.config.ts` para reenviar al backend:
- `/auth`, `/chat`, `/health`, `/uploads` → HTTP
- `/ws` → WebSocket

## Producción

En `.env` define las URLs completas del backend:

```
VITE_API_URL=https://api.tudominio.com
VITE_WS_URL=wss://api.tudominio.com
```
