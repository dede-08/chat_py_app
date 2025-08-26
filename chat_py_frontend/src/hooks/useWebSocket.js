import { useEffect, useRef, useState, useCallback } from 'react';
import authService from '../services/authService';

const useWebSocket = (url, options = {}) => {
  const {
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    onOpen,
    onMessage,
    onClose,
    onError,
    protocols
  } = options;

  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectCount, setReconnectCount] = useState(0);
  const [error, setError] = useState(null);

  const reconnectTimeoutRef = useRef(null);
  const shouldReconnectRef = useRef(true);
  const messageHandlersRef = useRef(new Map());

  // Función para conectar WebSocket
  const connect = useCallback(() => {
    if (!authService.isAuthenticated()) {
      setError('No authenticated user');
      return;
    }

    try {
      const token = authService.getToken();
      const wsUrl = `${url}?token=${token}`;
      const ws = new WebSocket(wsUrl, protocols);

      ws.onopen = (event) => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setReconnectCount(0);
        setError(null);
        onOpen?.(event);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Ejecutar handler específico si existe
          const handler = messageHandlersRef.current.get(data.type);
          if (handler) {
            handler(data);
          }
          
          // Ejecutar handler general
          onMessage?.(data, event);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        setSocket(null);
        onClose?.(event);

        // Intentar reconexión si es apropiado
        if (shouldReconnectRef.current && reconnectCount < maxReconnectAttempts) {
          setReconnectCount(prev => prev + 1);
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('WebSocket connection error');
        onError?.(event);
      };

      setSocket(ws);
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      setError('Failed to create WebSocket connection');
    }
  }, [url, protocols, onOpen, onMessage, onClose, onError, reconnectCount, maxReconnectAttempts, reconnectInterval]);

  // Función para desconectar
  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.close();
    }
    
    setSocket(null);
    setIsConnected(false);
  }, [socket]);

  // Función para enviar mensajes
  const sendMessage = useCallback((message) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
      socket.send(messageStr);
      return true;
    } else {
      console.warn('WebSocket is not connected');
      return false;
    }
  }, [socket]);

  // Función para registrar handlers de mensajes
  const onMessageType = useCallback((type, handler) => {
    messageHandlersRef.current.set(type, handler);
    
    // Retornar función de cleanup
    return () => {
      messageHandlersRef.current.delete(type);
    };
  }, []);

  // Función para reconectar manualmente
  const reconnect = useCallback(() => {
    setReconnectCount(0);
    shouldReconnectRef.current = true;
    connect();
  }, [connect]);

  // Conectar al montar y desconectar al desmontar
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, []);

  // Limpiar timeout al desmontar
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return {
    socket,
    isConnected,
    error,
    reconnectCount,
    sendMessage,
    onMessageType,
    reconnect,
    disconnect
  };
};

export default useWebSocket;
