import { useEffect, useRef, useState, useCallback } from 'react';
import { buildAuthorizedWsUrl } from '../services/wsClient';
import logger from '../services/logger';

interface WebSocketOptions {
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onOpen?: (event: Event) => void;
  onMessage?: (data: Record<string, unknown>, event: MessageEvent) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  protocols?: string | string[];
}

const useWebSocket = (urlOrPath: string, options: WebSocketOptions = {}) => {
  const { reconnectInterval = 3000, maxReconnectAttempts = 5, onOpen, onMessage, onClose, onError, protocols } = options;

  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const messageHandlersRef = useRef(new Map<string, (data: Record<string, unknown>) => void>());

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let reconnectCount = 0;
    let shouldReconnect = true;

    const connect = async () => {
      if (!shouldReconnect) return;

      try {
        const { ensureValidAccessToken } = await import('../services/wsClient');
        const token = await ensureValidAccessToken(30);
        if (!token) {
          setError('No authenticated user for WebSocket');
          return;
        }
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
            const data = JSON.parse(event.data) as Record<string, unknown>;
            const type = String(data.type ?? '');
            const handler = messageHandlersRef.current.get(type);
            if (handler) handler(data);
            onMessageRef.current?.(data, event);
          } catch (parseError) {
            logger.error('Error parsing WebSocket message', parseError instanceof Error ? parseError : null, {
              operation: 'useWebSocket_message',
            });
          }
        };

        ws.onclose = (event) => {
          logger.info('WebSocket disconnected', {
            operation: 'useWebSocket_close',
            code: event.code,
            reason: event.reason,
          });
          setIsConnected(false);
          setSocket(null);
          onCloseRef.current?.(event);

          if (shouldReconnect && reconnectCount < maxReconnectAttempts) {
            reconnectCount += 1;
            reconnectTimeout = setTimeout(connect, reconnectInterval);
          }
        };

        ws.onerror = (event) => {
          logger.error('WebSocket error', null, { operation: 'useWebSocket_error' });
          setError('WebSocket connection error');
          onErrorRef.current?.(event);
        };
      } catch (err) {
        logger.error('Error creating WebSocket', err instanceof Error ? err : null, {
          operation: 'useWebSocket_create',
        });
        setError('Failed to create WebSocket connection');
      }
    };

    connect();

    return () => {
      shouldReconnect = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) {
        ws.onclose = () => {};
        ws.close();
      }
      setSocket(null);
      setIsConnected(false);
    };
  }, [urlOrPath, protocols, maxReconnectAttempts, reconnectInterval]);

  const sendMessage = useCallback(
    (message: string | Record<string, unknown>) => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
        socket.send(messageStr);
        return true;
      }
      logger.warn('WebSocket is not connected', { operation: 'useWebSocket_sendMessage' });
      return false;
    },
    [socket]
  );

  const onMessageType = useCallback((type: string, handler: (data: Record<string, unknown>) => void) => {
    messageHandlersRef.current.set(type, handler);
    return () => {
      messageHandlersRef.current.delete(type);
    };
  }, []);

  return { socket, isConnected, error, sendMessage, onMessageType };
};

export default useWebSocket;
