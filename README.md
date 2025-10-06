# ChatPy - Aplicación de chat en tiempo real con Python

Una aplicación de chat moderna construida con FastAPI (backend) y React (frontend) que permite comunicación en tiempo real entre usuarios.

## Características

### Funcionalidades de Chat
- **Chats privados**: Conversaciones individuales entre usuarios
- **Mensajes en tiempo real**: Comunicación instantánea usando WebSockets
- **Historial de mensajes**: Persistencia de conversaciones en base de datos
- **Indicadores de estado**: 
  - Usuarios online/offline
  - Indicador de escritura ("está escribiendo...")
  - Confirmación de lectura (✓✓)
- **Interfaz moderna**: Diseño responsive y intuitivo
- **Autenticación segura**: JWT tokens para proteger las rutas

### Características Técnicas
- **Backend**: FastAPI con WebSockets
- **Base de datos**: MongoDB con Motor (async driver)
- **Frontend**: React con hooks y componentes funcionales
- **Autenticación**: JWT con bcrypt para hash de contraseñas
- **CORS**: Configurado para desarrollo local
- **Hash de contraseñas**: Bcrypt para almacenamiento seguro
- **Validación de datos**: Pydantic para validación de esquemas
- **CORS**: Configurado para permitir solo el frontend autorizado
