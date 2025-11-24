import authService from './authService';

const API_BASE_URL = import.meta.env.VITE_API_URL;
const WS_BASE_URL = import.meta.env.VITE_WS_URL;

class ChatService {
    constructor() {
        this.ws = null;
        this.messageHandlers = new Map();
        this.isConnected = false;
        this.isConnecting = false;
        this.messageQueue = [];
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectInterval = 3000; //3 segundos
    }

    // --- logica de websocket ---

    connect() {
        const token = authService.getToken();
        if (!token) {
            console.error('No hay token disponible para la conexión WebSocket.');
            return;
        }

        //verificar si ya hay una conexion activa o en proceso
        if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
            console.log('WebSocket ya está conectado o en proceso de conexión.');
            return;
        }

        if (this.isConnecting) {
            console.log('Ya hay una conexión en proceso.');
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
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (error) {
                    console.error('Error al parsear mensaje WebSocket:', error);
                }
            };

            this.ws.onclose = (event) => {
                console.log('WebSocket desconectado. Código:', event.code, 'Razón:', event.reason);
                this.isConnected = false;
                this.isConnecting = false;
                this.ws = null;
                this.handleMessage({ type: 'connection_status', connected: false });

                //solo intentar reconectar si no fue una desconexion intencional
                if (this.reconnectAttempts < this.maxReconnectAttempts && event.code !== 1000) {
                    this.reconnectAttempts++;
                    console.log(`Intento de reconexión ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);
                    setTimeout(() => this.connect(), this.reconnectInterval);
                }
            };

            this.ws.onerror = (error) => {
                console.error('Error en WebSocket:', error);
                this.isConnecting = false;
            };
        } catch (error) {
            console.error('Error al crear la instancia de WebSocket:', error);
            this.isConnecting = false;
        }
    }

    disconnect() {
        console.log('Desconectando WebSocket.');
        this.reconnectAttempts = this.maxReconnectAttempts;
        this.isConnecting = false;
        
        if (this.ws) {
            //verificar el estado antes de cerrar
            if (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN) {
                //deshabilitar los handlers antes de cerrar para evitar errores
                this.ws.onclose = () => {};
                this.ws.onerror = () => {};
                this.ws.close(1000, 'Desconexión intencional');
            }
            this.ws = null;
        }
        this.isConnected = false;
    }

    sendMessage(receiverEmail, content) {
        const message = {
            type: 'message',
            receiver_email: receiverEmail,
            content: content
        };

        //verificar si el WebSocket esta realmente conectado
        if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.warn('WebSocket no conectado. Añadiendo mensaje a la cola.');
            this.messageQueue.push(message);
            if (!this.isConnecting) {
                this.connect();
            }
            return;
        }

        try {
            this.ws.send(JSON.stringify(message));
        } catch (error) {
            console.error('Error al enviar mensaje:', error);
            //añadir a la cola si falla el envio
            this.messageQueue.push(message);
        }
    }

    processMessageQueue() {
        while (this.messageQueue.length > 0 && this.ws && this.ws.readyState === WebSocket.OPEN) {
            const message = this.messageQueue.shift();
            try {
                this.ws.send(JSON.stringify(message));
            } catch (error) {
                console.error('Error al procesar mensaje de la cola:', error);
                //volver a añadir el mensaje al principio de la cola
                this.messageQueue.unshift(message);
                break;
            }
        }
    }

    sendTypingIndicator(receiverEmail, isTyping) {
        if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        
        const message = {
            type: 'typing',
            receiver_email: receiverEmail,
            is_typing: isTyping
        };
        
        try {
            this.ws.send(JSON.stringify(message));
        } catch (error) {
            console.error('Error al enviar indicador de escritura:', error);
        }
    }

    sendReadReceipt(senderEmail) {
        if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        
        const message = {
            type: 'read',
            sender_email: senderEmail
        };
        
        try {
            this.ws.send(JSON.stringify(message));
        } catch (error) {
            console.error('Error al enviar confirmación de lectura:', error);
        }
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

    offMessage(type, handler) {
        const currentHandler = this.messageHandlers.get(type);
        if (currentHandler === handler) {
            this.messageHandlers.delete(type);
        }
    }

    //metodo para limpiar todos los listeners
    clearAllListeners() {
        this.messageHandlers.clear();
    }

    // --- metodos de la API ---

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
