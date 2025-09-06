import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import chatService from '../services/chatService';
import authService from '../services/authService';

//tipos de acciones
const CHAT_ACTIONS = {
  SET_USERS: 'SET_USERS',
  SET_SELECTED_USER: 'SET_SELECTED_USER',
  ADD_MESSAGE: 'ADD_MESSAGE',
  SET_MESSAGES: 'SET_MESSAGES',
  UPDATE_MESSAGE_STATUS: 'UPDATE_MESSAGE_STATUS',
  SET_USER_TYPING: 'SET_USER_TYPING',
  SET_USER_ONLINE_STATUS: 'SET_USER_ONLINE_STATUS',
  SET_UNREAD_COUNT: 'SET_UNREAD_COUNT',
  SET_CONNECTION_STATUS: 'SET_CONNECTION_STATUS',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR'
};

//estado inicial
const initialState = {
  users: [],
  selectedUser: null,
  messages: [],
  currentUser: authService.getUserEmail(),
  typingUsers: new Set(),
  onlineUsers: new Set(),
  unreadCounts: {},
  isConnected: false,
  error: null
};

//reducer
const chatReducer = (state, action) => {
  switch (action.type) {
    case CHAT_ACTIONS.SET_USERS:
      return { ...state, users: action.payload };
    
    case CHAT_ACTIONS.SET_SELECTED_USER:
      return { ...state, selectedUser: action.payload };
    
    case CHAT_ACTIONS.ADD_MESSAGE:
      return { 
        ...state, 
        messages: [...state.messages, action.payload] 
      };
    
    case CHAT_ACTIONS.SET_MESSAGES:
      return { ...state, messages: action.payload };
    
    case CHAT_ACTIONS.UPDATE_MESSAGE_STATUS:
      return {
        ...state,
        messages: state.messages.map(msg =>
          msg.id === action.payload.messageId
            ? { ...msg, [action.payload.field]: action.payload.value }
            : msg
        )
      };
    
    case CHAT_ACTIONS.SET_USER_TYPING: {
      const newTypingUsers = new Set(state.typingUsers);
      if (action.payload.isTyping) {
        newTypingUsers.add(action.payload.userEmail);
      } else {
        newTypingUsers.delete(action.payload.userEmail);
      }
      return { ...state, typingUsers: newTypingUsers };
    }
    
    case CHAT_ACTIONS.SET_USER_ONLINE_STATUS: {
      const newOnlineUsers = new Set(state.onlineUsers);
      if (action.payload.isOnline) {
        newOnlineUsers.add(action.payload.userEmail);
      } else {
        newOnlineUsers.delete(action.payload.userEmail);
      }
      return { ...state, onlineUsers: newOnlineUsers };
    }
    
    case CHAT_ACTIONS.SET_UNREAD_COUNT:
      return {
        ...state,
        unreadCounts: {
          ...state.unreadCounts,
          [action.payload.userEmail]: action.payload.count
        }
      };
    
    case CHAT_ACTIONS.SET_CONNECTION_STATUS:
      return { ...state, isConnected: action.payload };
    
    case CHAT_ACTIONS.SET_ERROR:
      return { ...state, error: action.payload };
    
    case CHAT_ACTIONS.CLEAR_ERROR:
      return { ...state, error: null };
    
    default:
      return state;
  }
};

// Crear contexto
const ChatContext = createContext();

// Hook para usar el contexto
export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat debe usarse dentro de un ChatProvider');
  }
  return context;
};

// Provider del contexto
export const ChatProvider = ({ children }) => {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  // Acciones
  const setUsers = useCallback((users) => {
    dispatch({ type: CHAT_ACTIONS.SET_USERS, payload: users });
  }, []);

  const setSelectedUser = useCallback((user) => {
    dispatch({ type: CHAT_ACTIONS.SET_SELECTED_USER, payload: user });
  }, []);

  const addMessage = useCallback((message) => {
    dispatch({ type: CHAT_ACTIONS.ADD_MESSAGE, payload: message });
  }, []);

  const setMessages = useCallback((messages) => {
    dispatch({ type: CHAT_ACTIONS.SET_MESSAGES, payload: messages });
  }, []);

  const updateMessageStatus = useCallback((messageId, field, value) => {
    dispatch({ 
      type: CHAT_ACTIONS.UPDATE_MESSAGE_STATUS, 
      payload: { messageId, field, value } 
    });
  }, []);

  const setUserTyping = useCallback((userEmail, isTyping) => {
    dispatch({ 
      type: CHAT_ACTIONS.SET_USER_TYPING, 
      payload: { userEmail, isTyping } 
    });
  }, []);

  const setUserOnlineStatus = useCallback((userEmail, isOnline) => {
    dispatch({ 
      type: CHAT_ACTIONS.SET_USER_ONLINE_STATUS, 
      payload: { userEmail, isOnline } 
    });
  }, []);

  const setUnreadCount = useCallback((userEmail, count) => {
    dispatch({ 
      type: CHAT_ACTIONS.SET_UNREAD_COUNT, 
      payload: { userEmail, count } 
    });
  }, []);

  const setConnectionStatus = useCallback((isConnected) => {
    dispatch({ type: CHAT_ACTIONS.SET_CONNECTION_STATUS, payload: isConnected });
  }, []);

  const setError = useCallback((error) => {
    dispatch({ type: CHAT_ACTIONS.SET_ERROR, payload: error });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: CHAT_ACTIONS.CLEAR_ERROR });
  }, []);

  // Funciones de utilidad
  const sendMessage = (content) => {
    if (!state.selectedUser || !content.trim()) return false;

    const tempMessage = {
      id: `temp-${Date.now()}`,
      sender_email: state.currentUser,
      receiver_email: state.selectedUser.email,
      content: content.trim(),
      timestamp: new Date().toISOString(),
      is_read: false,
      is_temporary: true
    };

    // Agregar mensaje temporalmente
    addMessage(tempMessage);

    // Enviar mediante WebSocket
    return chatService.sendMessage(state.selectedUser.email, content.trim());
  };

  const loadChatHistory = async (userEmail) => {
    try {
      const history = await chatService.getChatHistory(userEmail);
      setMessages(history);
      return history;
    } catch (error) {
      setError('Error al cargar historial de chat');
      throw error;
    }
  };

  const loadUsers = async () => {
    try {
      const users = await chatService.getUsers();
      setUsers(users);
      return users;
    } catch (error) {
      setError('Error al cargar usuarios');
      throw error;
    }
  };

  // Iniciar y cerrar la conexión WebSocket
  useEffect(() => {
    chatService.connect();

    return () => {
      chatService.disconnect();
    };
  }, []); // Se ejecuta solo al montar y desmontar el provider

  // Configurar listeners de WebSocket
  useEffect(() => {
    // Handler para el estado de la conexión
    const handleConnectionStatus = (data) => {
      setConnectionStatus(data.connected);
    };

    // Handler para mensajes nuevos
    const handleNewMessage = (data) => {
      addMessage(data);
      
      // Marcar como leído si es del usuario seleccionado
      if (data.sender_email === state.selectedUser?.email) {
        chatService.sendReadReceipt(data.sender_email);
      }
    };

    // Handler para indicador de escritura
    const handleTyping = (data) => {
      setUserTyping(data.sender_email, data.is_typing);
    };

    // Handler para estado de usuario
    const handleUserStatus = (data) => {
      setUserOnlineStatus(data.user_email, data.is_online);
    };

    // Handler para confirmación de lectura
    const handleReadReceipt = (data) => {
      // Actualiza el estado de los mensajes de una sola vez, en lugar de en un bucle
      setMessages(prevMessages =>
        prevMessages.map(msg =>
          (msg.sender_email === state.currentUser && msg.receiver_email === data.reader_email && !msg.is_read)
            ? { ...msg, is_read: true }
            : msg
        )
      );
    };

    // Registrar handlers
    chatService.onMessage('connection_status', handleConnectionStatus);
    chatService.onMessage('message', handleNewMessage);
    chatService.onMessage('typing', handleTyping);
    chatService.onMessage('user_status', handleUserStatus);
    chatService.onMessage('read_receipt', handleReadReceipt);

    // --- CAMBIO CLAVE: Función de limpieza ---
    // Se eliminan los listeners cuando el efecto se "limpia" para evitar duplicados y fugas de memoria.
    return () => {
      // Nota: Esto asume que tu chatService.js tiene un método .off() o similar para anular el registro.
      if (typeof chatService.off === 'function') {
        chatService.off('connection_status', handleConnectionStatus);
        chatService.off('message', handleNewMessage);
        chatService.off('typing', handleTyping);
        chatService.off('user_status', handleUserStatus);
        chatService.off('read_receipt', handleReadReceipt);
      }
    };
  }, [
      // --- CAMBIO CLAVE: Dependencias corregidas ---
      // Se quita state.messages y se añaden las funciones que realmente se usan.
      state.selectedUser,
      state.currentUser,
      addMessage,
      setMessages,
      setUserTyping,
      setUserOnlineStatus,
      setConnectionStatus
  ]);

  // Valor del contexto
  const contextValue = {
    // Estado
    ...state,
    
    // Acciones
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
    
    // Funciones
    sendMessage,
    loadChatHistory,
    loadUsers,
    
    // Utilidades
    isUserOnline: (userEmail) => state.onlineUsers.has(userEmail),
    isUserTyping: (userEmail) => state.typingUsers.has(userEmail),
    getUnreadCount: (userEmail) => state.unreadCounts[userEmail] || 0
  };

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
};

export default ChatContext;