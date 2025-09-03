import authService from './authService';

const API_BASE_URL = 'http://localhost:8000';
const WS_BASE_URL = 'ws://localhost:8000';

class ChatService {
    constructor() {
        this.ws = null;
        this.messageHandlers = new Map();
        this.isConnected = false;
        this.isConnecting = false;
    }

    //conectar websocket
    connect() {
        const token = authService.getToken();
        console.log('Token usado para WebSocket:', token);
        if (!token) {
            console.error('No hay token disponible');
            return;
        }

        if (this.ws || this.isConnecting) {
            return;
        }

        this.isConnecting = true;
        this.ws = new WebSocket(`${WS_BASE_URL}/ws/chat?token=${token}`);

        this.ws.onopen = () => {
            console.log('WebSocket conectado');
            this.isConnected = true;
            this.isConnecting = false;
            //notificar que la conexión está establecida
            this.ws.send(JSON.stringify({ type: 'ping' }));
            this.handleMessage({ type: 'connection_status', connected: true });
        };

        this.ws.onmessage = (event) => {
            console.log('Mensaje recibido:', event.data);
            const data = JSON.parse(event.data);
            this.handleMessage(data);
        };

        this.ws.onclose = () => {
            console.log('WebSocket desconectado');
            this.isConnected = false;
            this.isConnecting = false;
            this.ws = null;
            //notificar que la conexion se ha perdido
            this.handleMessage({ type: 'connection_status', connected: false });
        };

        this.ws.onerror = (error) => {
            console.error('Error en WebSocket:', error);
            this.isConnected = false;
            this.isConnecting = false;
            this.ws = null;
            //notificar error de conexión
            this.handleMessage({ type: 'connection_status', connected: false, error: true });
        };
    }

    //desconectar websocket
    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
    }

    //enviar mensaje privado
    sendMessage(receiverEmail, content) {
        if (!this.isConnected) {
            console.error('WebSocket no conectado');
            return;
        }

        const message = {
            type: 'message',
            receiver_email: receiverEmail,
            content: content
        };

        this.ws.send(JSON.stringify(message));
    }

    //enviar indicador de escritura
    sendTypingIndicator(receiverEmail, isTyping) {
        if (!this.isConnected) return;

        const message = {
            type: 'typing',
            receiver_email: receiverEmail,
            is_typing: isTyping
        };

        this.ws.send(JSON.stringify(message));
    }

    //enviar confirmacion de lectura
    sendReadReceipt(senderEmail) {
        if (!this.isConnected) return;

        const message = {
            type: 'read',
            sender_email: senderEmail
        };

        this.ws.send(JSON.stringify(message));
    }

    //manejar mensajes recibidos
    handleMessage(data) {
        const handler = this.messageHandlers.get(data.type);
        if (handler) {
            handler(data);
        }
    }

    //registrar manejadores de mensajes
    onMessage(type, handler) {
        this.messageHandlers.set(type, handler);
    }

    //obtener historial de chat
    async getChatHistory(otherUserEmail, limit = 50) {
        const token = authService.getToken();
        const response = await fetch(
            `${API_BASE_URL}/chat/history/${otherUserEmail}?limit=${limit}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        if (!response.ok) {
            throw new Error('Error al obtener historial de chat');
        }

        return await response.json();
    }

    //obtener salas de chat del usuario
    async getChatRooms() {
        const token = authService.getToken();
        const response = await fetch(`${API_BASE_URL}/chat/rooms`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Error al obtener salas de chat');
        }

        return await response.json();
    }

    //obtener lista de usuarios
    async getUsers() {
        const token = authService.getToken();
        const response = await fetch(`${API_BASE_URL}/chat/users`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Error al obtener usuarios');
        }

        return await response.json();
    }

    //obtener numero de mensajes no leidos
    async getUnreadCount() {
        const token = authService.getToken();
        const response = await fetch(`${API_BASE_URL}/chat/unread-count`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Error al obtener conteo de mensajes no leídos');
        }

        const data = await response.json();
        return data.unread_count;
    }

    //marcar mensajes como leidos
    async markMessagesAsRead(senderEmail) {
        const token = authService.getToken();
        const response = await fetch(`${API_BASE_URL}/chat/mark-read/${senderEmail}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Error al marcar mensajes como leídos');
        }

        return await response.json();
    }
}

const chatService = new ChatService();
export default chatService;
