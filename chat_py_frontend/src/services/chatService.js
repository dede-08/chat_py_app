import authService from './authService';

const API_BASE_URL = 'http://localhost:8000';
const WS_BASE_URL = 'ws://localhost:8000';

class ChatService {
    constructor() {
        this.ws = null;
        this.messageHandlers = new Map();
        this.isConnected = false;
        this.isConnecting = false;
        this.messageQueue = [];
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectInterval = 3000; // 3 segundos
    }

    // --- WebSocket Logic ---

    connect() {
        const token = authService.getToken();
        if (!token) {
            console.error('No hay token disponible para la conexión WebSocket.');
            return;
        }

        if (this.ws || this.isConnecting) {
            console.log('WebSocket ya está conectado o en proceso de conexión.');
            return;
        }

        this.isConnecting = true;
        console.log('Intentando conectar WebSocket...');

        try {
            this.ws = new WebSocket(`${WS_BASE_URL}/ws/chat?token=${token}`);

            this.ws.onopen = () => {
                console.log('WebSocket conectado exitosamente.');
                this.isConnected = true;
                this.isConnecting = false;
                this.reconnectAttempts = 0;
                this.handleMessage({ type: 'connection_status', connected: true });
                this.processMessageQueue();
            };

            this.ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handleMessage(data);
            };

            this.ws.onclose = () => {
                console.log('WebSocket desconectado.');
                this.isConnected = false;
                this.isConnecting = false;
                this.ws = null;
                this.handleMessage({ type: 'connection_status', connected: false });

                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    console.log(`Intento de reconexión ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);
                    setTimeout(() => this.connect(), this.reconnectInterval);
                }
            };

            this.ws.onerror = (error) => {
                console.error('Error en WebSocket:', error);
            };
        } catch (error) {
            console.error('Error al crear la instancia de WebSocket:', error);
            this.isConnecting = false;
        }
    }

    disconnect() {
        console.log('Desconectando WebSocket.');
        this.reconnectAttempts = this.maxReconnectAttempts;
        if (this.ws) {
            this.ws.close();
        }
    }

    sendMessage(receiverEmail, content) {
        const message = {
            type: 'message',
            receiver_email: receiverEmail,
            content: content
        };

        if (!this.isConnected) {
            console.warn('WebSocket no conectado. Añadiendo mensaje a la cola.');
            this.messageQueue.push(message);
            if (!this.isConnecting) {
                this.connect();
            }
            return;
        }

        this.ws.send(JSON.stringify(message));
    }

    processMessageQueue() {
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            this.ws.send(JSON.stringify(message));
        }
    }

    sendTypingIndicator(receiverEmail, isTyping) {
        if (!this.isConnected) return;
        const message = {
            type: 'typing',
            receiver_email: receiverEmail,
            is_typing: isTyping
        };
        this.ws.send(JSON.stringify(message));
    }

    sendReadReceipt(senderEmail) {
        if (!this.isConnected) return;
        const message = {
            type: 'read',
            sender_email: senderEmail
        };
        this.ws.send(JSON.stringify(message));
    }

    handleMessage(data) {
        const handler = this.messageHandlers.get(data.type);
        if (handler) {
            handler(data);
        }
    }

    onMessage(type, handler) {
        this.messageHandlers.set(type, handler);
    }

    // --- API Methods ---

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
        if (!response.ok) throw new Error('Error al obtener historial de chat');
        return await response.json();
    }

    async getChatRooms() {
        const token = authService.getToken();
        const response = await fetch(`${API_BASE_URL}/chat/rooms`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) throw new Error('Error al obtener salas de chat');
        return await response.json();
    }

    async getUsers() {
        const token = authService.getToken();
        const response = await fetch(`${API_BASE_URL}/chat/users`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) throw new Error('Error al obtener usuarios');
        return await response.json();
    }

    async getUnreadCount() {
        const token = authService.getToken();
        const response = await fetch(`${API_BASE_URL}/chat/unread-count`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) throw new Error('Error al obtener conteo de mensajes no leídos');
        const data = await response.json();
        return data.unread_count;
    }

    async markMessagesAsRead(senderEmail) {
        const token = authService.getToken();
        const response = await fetch(`${API_BASE_URL}/chat/mark-read/${senderEmail}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) throw new Error('Error al marcar mensajes como leídos');
        return await response.json();
    }
}

const chatService = new ChatService();
export default chatService;
