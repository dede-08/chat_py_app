import logger from './logger';
import http from './httpClient';
import { buildAuthorizedWsUrl } from './wsClient';
import { handleAxiosError } from '../utils/errorHandler';
import type { 
  ChatMessage, 
  ChatRoom, 
  User,
  WebSocketMessage,
  WebSocketConnectionStatus,
} from '../types';

type MessageHandler = (data: WebSocketMessage) => void;

interface QueueMessage {
  type: string;
  receiver_email?: string;
  sender_email?: string;
  content?: string;
  is_typing?: boolean;
}

class ChatService {
    private ws: WebSocket | null = null;
    private messageHandlers: Map<string, MessageHandler> = new Map();
    private isConnected: boolean = false;
    private isConnecting: boolean = false;
    private messageQueue: QueueMessage[] = [];
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;
    private reconnectInterval: number = 3000; //3 segundos

    //logica de websocket
    connect(): void {
        const wsUrl = buildAuthorizedWsUrl('/ws/chat');
        if (!wsUrl) {
            logger.error('No hay token disponible para la conexión WebSocket', null, { 
                operation: 'websocket_connect' 
            });
            return;
        }

        //verificar si ya hay una conexion activa o en proceso
        if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
            logger.debug('WebSocket ya está conectado o en proceso de conexión', { 
                operation: 'websocket_connect' 
            });
            return;
        }

        if (this.isConnecting) {
            logger.debug('Ya hay una conexión en proceso', { operation: 'websocket_connect' });
            return;
        }

        this.isConnecting = true;
        logger.info('Intentando conectar WebSocket...', { operation: 'websocket_connect' });

        try {
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                logger.info('WebSocket conectado exitosamente', { operation: 'websocket_connect' });
                this.isConnected = true;
                this.isConnecting = false;
                this.reconnectAttempts = 0;
                this.handleMessage({ type: 'connection_status', connected: true } as WebSocketConnectionStatus);
                this.processMessageQueue();
            };

            this.ws.onmessage = (event: MessageEvent) => {
                try {
                    const data = JSON.parse(event.data) as WebSocketMessage;
                    this.handleMessage(data);
                } catch (error) {
                    logger.error('Error al parsear mensaje WebSocket', error instanceof Error ? error : null, { 
                        operation: 'websocket_message',
                        rawData: event.data 
                    });
                }
            };

            this.ws.onclose = (event: CloseEvent) => {
                logger.info('WebSocket desconectado', { 
                    operation: 'websocket_close',
                    code: event.code,
                    reason: event.reason 
                });
                this.isConnected = false;
                this.isConnecting = false;
                this.ws = null;
                this.handleMessage({ type: 'connection_status', connected: false } as WebSocketConnectionStatus);

                //solo intentar reconectar si no fue una desconexion intencional
                if (this.reconnectAttempts < this.maxReconnectAttempts && event.code !== 1000) {
                    this.reconnectAttempts++;
                    logger.info(`Intento de reconexión ${this.reconnectAttempts}/${this.maxReconnectAttempts}`, { 
                        operation: 'websocket_reconnect',
                        attempt: this.reconnectAttempts,
                        maxAttempts: this.maxReconnectAttempts
                    });
                    setTimeout(() => this.connect(), this.reconnectInterval);
                }
            };

            this.ws.onerror = (error: Event) => {
                logger.error('Error en WebSocket', error instanceof Error ? error : null, { operation: 'websocket_error' });
                this.isConnecting = false;
            };
        } catch (error) {
            logger.error('Error al crear la instancia de WebSocket', error instanceof Error ? error : null, { 
                operation: 'websocket_create' 
            });
            this.isConnecting = false;
        }
    }

    disconnect(): void {
        logger.info('Desconectando WebSocket', { operation: 'websocket_disconnect' });
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

    sendMessage(receiverEmail: string, content: string): void {
        const message: QueueMessage = {
            type: 'message',
            receiver_email: receiverEmail,
            content: content
        };

        //verificar si el WebSocket esta realmente conectado
        if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
            logger.warn('WebSocket no conectado. Añadiendo mensaje a la cola', { 
                operation: 'send_message',
                queueLength: this.messageQueue.length 
            });
            this.messageQueue.push(message);
            if (!this.isConnecting) {
                this.connect();
            }
            return;
        }

        try {
            this.ws.send(JSON.stringify(message));
            logger.debug('Mensaje enviado exitosamente', { 
                operation: 'send_message',
                receiver: receiverEmail 
            });
        } catch (error) {
            logger.error('Error al enviar mensaje', error instanceof Error ? error : null, { 
                operation: 'send_message',
                receiver: receiverEmail 
            });
            //añadir a la cola si falla el envio
            this.messageQueue.push(message);
        }
    }

    processMessageQueue(): void {
        while (this.messageQueue.length > 0 && this.ws && this.ws.readyState === WebSocket.OPEN) {
            const message = this.messageQueue.shift();
            if (!message) break;
            
            try {
                this.ws.send(JSON.stringify(message));
                logger.debug('Mensaje de cola enviado exitosamente', { 
                    operation: 'process_message_queue',
                    remainingInQueue: this.messageQueue.length 
                });
            } catch (error) {
                logger.error('Error al procesar mensaje de la cola', error instanceof Error ? error : null, { 
                    operation: 'process_message_queue' 
                });
                //volver a añadir el mensaje al principio de la cola
                this.messageQueue.unshift(message);
                break;
            }
        }
    }

    sendTypingIndicator(receiverEmail: string, isTyping: boolean): void {
        if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        
        const message: QueueMessage = {
            type: 'typing',
            receiver_email: receiverEmail,
            is_typing: isTyping
        };
        
        try {
            this.ws.send(JSON.stringify(message));
        } catch (error) {
            logger.error('Error al enviar indicador de escritura', error instanceof Error ? error : null, { 
                operation: 'send_typing_indicator' 
            });
        }
    }

    sendReadReceipt(senderEmail: string): void {
        if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        
        const message: QueueMessage = {
            type: 'read',
            sender_email: senderEmail
        };
        
        try {
            this.ws.send(JSON.stringify(message));
        } catch (error) {
            logger.error('Error al enviar confirmación de lectura', error instanceof Error ? error : null, { 
                operation: 'send_read_receipt' 
            });
        }
    }

    handleMessage(data: WebSocketMessage): void {
        const handler = this.messageHandlers.get(data.type);
        if (handler) {
            handler(data);
        }
    }

    onMessage(type: string, handler: MessageHandler): void {
        this.messageHandlers.set(type, handler);
    }

    offMessage(type: string, handler: MessageHandler): void {
        const currentHandler = this.messageHandlers.get(type);
        if (currentHandler === handler) {
            this.messageHandlers.delete(type);
        }
    }

    //metodo para limpiar todos los listeners
    clearAllListeners(): void {
        this.messageHandlers.clear();
    }

    //metodos de la API

    async getChatHistory(otherUserEmail: string, limit: number = 50): Promise<ChatMessage[]> {
        try {
            const response = await http.get<ChatMessage[]>(`/chat/history/${otherUserEmail}?limit=${limit}`);
            return response.data;
        } catch (error) {
            const info = handleAxiosError(error as any, { operation: 'getChatHistory', otherUserEmail });
            logger.error('Error al obtener historial de chat', new Error(info.error), { operation: 'getChatHistory', otherUserEmail });
            throw new Error(info.error);
        }
    }

    async getChatRooms(): Promise<ChatRoom[]> {
        try {
            const response = await http.get<ChatRoom[]>(`/chat/rooms`);
            return response.data;
        } catch (error) {
            const info = handleAxiosError(error as any, { operation: 'getChatRooms' });
            logger.error('Error al obtener salas de chat', new Error(info.error), { operation: 'getChatRooms' });
            throw new Error(info.error);
        }
    }

    async getUsers(): Promise<User[]> {
        try {
            const response = await http.get<User[]>(`/chat/users`);
            return response.data;
        } catch (error) {
            const info = handleAxiosError(error as any, { operation: 'getUsers' });
            logger.error('Error al obtener usuarios', new Error(info.error), { operation: 'getUsers' });
            throw new Error(info.error);
        }
    }

    async getUnreadCount(): Promise<number> {
        try {
            const response = await http.get<{ unread_count: number }>(`/chat/unread-count`);
            return response.data.unread_count;
        } catch (error) {
            const info = handleAxiosError(error as any, { operation: 'getUnreadCount' });
            logger.error('Error al obtener conteo de mensajes no leídos', new Error(info.error), { operation: 'getUnreadCount' });
            throw new Error(info.error);
        }
    }

    async markMessagesAsRead(senderEmail: string): Promise<{ success: boolean }> {
        try {
            const response = await http.post<{ success: boolean }>(`/chat/mark-read/${senderEmail}`);
            return response.data;
        } catch (error) {
            const info = handleAxiosError(error as any, { operation: 'markMessagesAsRead', senderEmail });
            logger.error('Error al marcar mensajes como leídos', new Error(info.error), { operation: 'markMessagesAsRead', senderEmail });
            throw new Error(info.error);
        }
    }
}

const chatService = new ChatService();
export default chatService;

