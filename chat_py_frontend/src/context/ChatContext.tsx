import { useCallback, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';
import chatService from '../services/chatService';
import authService from '../services/authService';
import { chatReducer } from './chatReducer';
import { CHAT_ACTIONS } from './chatActions';
import { initialState } from './initialState';
import { ChatContext } from './ChatContextProvider';
import type { ChatContextValue } from './types';
import type { ChatMessage, User } from '../types';

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider = ({ children }: ChatProviderProps) => {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  const setUsers = useCallback((users: User[]) => {
    dispatch({ type: CHAT_ACTIONS.SET_USERS, payload: users });
  }, []);

  const setSelectedUser = useCallback((user: User | null) => {
    dispatch({ type: CHAT_ACTIONS.SET_SELECTED_USER, payload: user });
  }, []);

  const addMessage = useCallback((message: ChatMessage) => {
    dispatch({ type: CHAT_ACTIONS.ADD_MESSAGE, payload: message });
  }, []);

  const setMessages = useCallback((messages: ChatMessage[]) => {
    dispatch({ type: CHAT_ACTIONS.SET_MESSAGES, payload: messages });
  }, []);

  const updateMessageStatus = useCallback(
    (messageId: string, field: keyof ChatMessage, value: ChatMessage[keyof ChatMessage]) => {
      dispatch({
        type: CHAT_ACTIONS.UPDATE_MESSAGE_STATUS,
        payload: { messageId, field, value },
      });
    },
    []
  );

  const setUserTyping = useCallback((userEmail: string, isTyping: boolean) => {
    dispatch({
      type: CHAT_ACTIONS.SET_USER_TYPING,
      payload: { userEmail, isTyping },
    });
  }, []);

  const setUserOnlineStatus = useCallback((userEmail: string, isOnline: boolean) => {
    dispatch({
      type: CHAT_ACTIONS.SET_USER_ONLINE_STATUS,
      payload: { userEmail, isOnline },
    });
  }, []);

  const setUnreadCount = useCallback((userEmail: string, count: number) => {
    dispatch({
      type: CHAT_ACTIONS.SET_UNREAD_COUNT,
      payload: { userEmail, count },
    });
  }, []);

  const setConnectionStatus = useCallback((isConnected: boolean) => {
    dispatch({ type: CHAT_ACTIONS.SET_CONNECTION_STATUS, payload: isConnected });
  }, []);

  const setError = useCallback((error: string | null) => {
    dispatch({ type: CHAT_ACTIONS.SET_ERROR, payload: error });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: CHAT_ACTIONS.CLEAR_ERROR });
  }, []);

  const sendMessage = useCallback(
    (content: string): boolean => {
      if (!state.selectedUser || !content.trim()) return false;
      const currentUserEmail = authService.getUserEmail();
      const tempMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        sender_email: currentUserEmail ?? '',
        receiver_email: state.selectedUser.email,
        content: content.trim(),
        timestamp: new Date().toISOString(),
        is_read: false,
      };
      addMessage(tempMessage);
      chatService.sendMessage(state.selectedUser.email, content.trim());
      return true;
    },
    [addMessage, state.selectedUser]
  );

  const loadChatHistory = useCallback(
    async (userEmail: string): Promise<ChatMessage[]> => {
      try {
        const history = await chatService.getChatHistory(userEmail);
        setMessages(history);
        return history;
      } catch (error) {
        setError('Error al cargar historial de chat');
        throw error;
      }
    },
    [setMessages, setError]
  );

  const loadUsers = useCallback(async (): Promise<User[]> => {
    try {
      const users = await chatService.getUsers();
      setUsers(users);
      return users;
    } catch (error) {
      setError('Error al cargar usuarios');
      throw error;
    }
  }, [setUsers, setError]);

  const sendTypingIndicator = useCallback((receiverEmail: string, isTyping: boolean) => {
    if (!receiverEmail) return;
    chatService.sendTypingIndicator(receiverEmail, isTyping);
  }, []);

  const markMessagesAsRead = useCallback(async (senderEmail: string) => {
    if (!senderEmail) return;
    await chatService.markMessagesAsRead(senderEmail);
  }, []);

  useEffect(() => {
    if (authService.isAuthenticated()) {
      chatService.connect();
      loadUsers().catch(() => undefined);
    }
    return () => {
      chatService.disconnect();
    };
  }, [loadUsers]);

  useEffect(() => {
    const handleConnectionStatus = (data: Record<string, unknown>) => {
      setConnectionStatus(Boolean(data.connected));
    };

    const handleNewMessage = (data: Record<string, unknown>) => {
      const message = data as unknown as ChatMessage;
      addMessage(message);
      const currentState = stateRef.current;
      if (message.sender_email === currentState.selectedUser?.email) {
        chatService.sendReadReceipt(message.sender_email);
      }
    };

    const handleTyping = (data: Record<string, unknown>) => {
      setUserTyping(String(data.sender_email ?? ''), Boolean(data.is_typing));
    };

    const handleUserStatus = (data: Record<string, unknown>) => {
      setUserOnlineStatus(String(data.user_email ?? ''), Boolean(data.is_online));
    };

    const handleReadReceipt = (data: Record<string, unknown>) => {
      const currentUserEmail = authService.getUserEmail();
      const currentState = stateRef.current;
      setMessages(
        currentState.messages.map((msg) =>
          currentUserEmail &&
          msg.sender_email === currentUserEmail &&
          msg.receiver_email === String(data.reader_email ?? '') &&
          !msg.is_read
            ? { ...msg, is_read: true }
            : msg
        )
      );
    };

    chatService.onMessage('connection_status', handleConnectionStatus);
    chatService.onMessage('message', handleNewMessage);
    chatService.onMessage('typing', handleTyping);
    chatService.onMessage('user_status', handleUserStatus);
    chatService.onMessage('read_receipt', handleReadReceipt);

    return () => {
      chatService.offMessage('connection_status', handleConnectionStatus);
      chatService.offMessage('message', handleNewMessage);
      chatService.offMessage('typing', handleTyping);
      chatService.offMessage('user_status', handleUserStatus);
      chatService.offMessage('read_receipt', handleReadReceipt);
    };
  }, [addMessage, setConnectionStatus, setMessages, setUserOnlineStatus, setUserTyping]);

  const contextValue: ChatContextValue = useMemo(
    () => ({
      ...state,
      setUsers,
      setSelectedUser,
      addMessage,
      setMessages,
      updateMessageStatus,
      setUserTyping,
      setUserOnlineStatus,
      setUnreadCount,
      setConnectionStatus,
      setError,
      clearError,
      sendMessage,
      loadChatHistory,
      loadUsers,
      sendTypingIndicator,
      markMessagesAsRead,
      isUserOnline: (userEmail: string) => state.onlineUsers.has(userEmail),
      isUserTyping: (userEmail: string) => state.typingUsers.has(userEmail),
      getUnreadCount: (userEmail: string) => state.unreadCounts[userEmail] || 0,
    }),
    [
      state,
      setUsers,
      setSelectedUser,
      addMessage,
      setMessages,
      updateMessageStatus,
      setUserTyping,
      setUserOnlineStatus,
      setUnreadCount,
      setConnectionStatus,
      setError,
      clearError,
      sendMessage,
      loadChatHistory,
      loadUsers,
      sendTypingIndicator,
      markMessagesAsRead,
    ]
  );

  return <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>;
};
