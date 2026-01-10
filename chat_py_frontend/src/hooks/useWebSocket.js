import { useEffect, useRef, useState, useCallback } from 'react';
import { buildAuthorizedWsUrl, hasWsToken } from '../services/wsClient';
import logger from '../services/logger';

const useWebSocket = (urlOrPath, options = {}) => {
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

  //usar refs para mantener las callbacks y evitar re-renders
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
      if (!hasWsToken() || !shouldReconnect) {
        setError('No authenticated user or reconnection disabled');
        return;
      }

      try {
        const wsUrl = buildAuthorizedWsUrl(urlOrPath);
        if (!wsUrl) {
          setError('Missing token for WebSocket');
          return;
        }
        ws = new WebSocket(wsUrl, protocols);
        setSocket(ws);

        ws.onopen = (event) => {
          logger.info('WebSocket connected', { operation: 'useWebSocket_connect' });
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
            logger.error('Error parsing WebSocket message', error, { 
              operation: 'useWebSocket_message' 
            });
          }
        };

        ws.onclose = (event) => {
          logger.info('WebSocket disconnected', { 
            operation: 'useWebSocket_close',
            code: event.code,
            reason: event.reason 
          });
          setIsConnected(false);
          setSocket(null);
          onCloseRef.current?.(event);

          if (shouldReconnect && reconnectCount < maxReconnectAttempts) {
            reconnectCount++;
            reconnectTimeout = setTimeout(connect, reconnectInterval);
          }
        };

        ws.onerror = (event) => {
          logger.error('WebSocket error', event, { operation: 'useWebSocket_error' });
          setError('WebSocket connection error');
          onErrorRef.current?.(event);
          //el evento onclose se ejecutara next, que maneja la reconexion.
        };

      } catch (err) {
        logger.error('Error creating WebSocket', err, { operation: 'useWebSocket_create' });
        setError('Failed to create WebSocket connection');
      }
    };

    connect();

    return () => {
      shouldReconnect = false; // evitar reconexion en unmount
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (ws) {
        //evitar "WebSocket is closed before the connection is established"
        ws.onclose = () => {}; // deshabilitar el handler onclose primero
        ws.close();
      }
      setSocket(null);
      setIsConnected(false);
    };
  //el efecto solo debe ejecutarse cuando el URL o protocols cambian.
  }, [urlOrPath, protocols, maxReconnectAttempts, reconnectInterval]);

  const sendMessage = useCallback((message) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
      socket.send(messageStr);
      return true;
    } else {
      logger.warn('WebSocket is not connected', { operation: 'useWebSocket_sendMessage' });
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