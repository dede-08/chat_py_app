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
  const [error, setError] = useState(null);

  // Use refs to hold callbacks to prevent re-renders from changing them
  const onOpenRef = useRef(onOpen);
  const onMessageRef = useRef(onMessage);
  const onCloseRef = useRef(onClose);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onOpenRef.current = onOpen;
    onMessageRef.current = onMessage;
    onCloseRef.current = onClose;
    onErrorRef.current = onError;
  });

  const messageHandlersRef = useRef(new Map());
  
  useEffect(() => {
    let ws = null;
    let reconnectTimeout = null;
    let reconnectCount = 0;
    let shouldReconnect = true;

    const connect = () => {
      if (!authService.isAuthenticated() || !shouldReconnect) {
        setError('No authenticated user or reconnection disabled');
        return;
      }

      try {
        const token = authService.getToken();
        const wsUrl = `${url}?token=${token}`;
        ws = new WebSocket(wsUrl, protocols);
        setSocket(ws);

        ws.onopen = (event) => {
          console.log('WebSocket connected');
          setIsConnected(true);
          reconnectCount = 0;
          setError(null);
          onOpenRef.current?.(event);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            const handler = messageHandlersRef.current.get(data.type);
            if (handler) {
              handler(data);
            }
            onMessageRef.current?.(data, event);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        ws.onclose = (event) => {
          console.log('WebSocket disconnected');
          setIsConnected(false);
          setSocket(null);
          onCloseRef.current?.(event);

          if (shouldReconnect && reconnectCount < maxReconnectAttempts) {
            reconnectCount++;
            reconnectTimeout = setTimeout(connect, reconnectInterval);
          }
        };

        ws.onerror = (event) => {
          console.error('WebSocket error:', event);
          setError('WebSocket connection error');
          onErrorRef.current?.(event);
          // The onclose event will be fired next, which handles reconnection.
        };

      } catch (err) {
        console.error('Error creating WebSocket:', err);
        setError('Failed to create WebSocket connection');
      }
    };

    connect();

    return () => {
      shouldReconnect = false; // Prevent reconnection on unmount
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (ws) {
        // Prevent "WebSocket is closed before the connection is established"
        ws.onclose = () => {}; // Disable onclose handler first
        ws.close();
      }
      setSocket(null);
      setIsConnected(false);
    };
  // The effect should only run when the URL or protocols change.
  }, [url, protocols, maxReconnectAttempts, reconnectInterval]);

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

  const onMessageType = useCallback((type, handler) => {
    messageHandlersRef.current.set(type, handler);
    return () => {
      messageHandlersRef.current.delete(type);
    };
  }, []);

  return {
    socket,
    isConnected,
    error,
    sendMessage,
    onMessageType,
  };
};

export default useWebSocket;