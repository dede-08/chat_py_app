import React, { useReducer, useEffect, useCallback, useRef } from 'react';
import chatService from '../services/chatService';
import { chatReducer } from './chatReducer';
import { CHAT_ACTIONS } from './chatActions';
import { initialState } from './initialState';
import { ChatContext } from './ChatContextProvider';

//provider del contexto
export const ChatProvider = ({ children }) => {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  //ref para acceder al estado mas reciente sin causar re-renders
  const stateRef = useRef(state);
  stateRef.current = state;

  //acciones
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

  //funciones de utilidad
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

    //agregar mensaje temporalmente
    addMessage(tempMessage);

    //enviar mediante WebSocket
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

  //iniciar y cerrar la conexion WebSocket
  useEffect(() => {
    chatService.connect();

    return () => {
      chatService.disconnect();
    };
  }, []); //se ejecuta solo al montar y desmontar el provider

  //configurar listeners de WebSocket
  useEffect(() => {
    //handler para el estado de la conexion
    const handleConnectionStatus = (data) => {
      setConnectionStatus(data.connected);
    };

    //handler para mensajes nuevos
    const handleNewMessage = (data) => {
      addMessage(data);
      
      //marcar como leido si es del usuario seleccionado
      //usar stateRef para acceder al estado mas reciente
      const currentState = stateRef.current;
      if (data.sender_email === currentState.selectedUser?.email) {
        chatService.sendReadReceipt(data.sender_email);
      }
    };

    //handler para indicador de escritura
    const handleTyping = (data) => {
      setUserTyping(data.sender_email, data.is_typing);
    };

    //handler para estado de usuario
    const handleUserStatus = (data) => {
      setUserOnlineStatus(data.user_email, data.is_online);
    };

    //handler para confirmacion de lectura
    const handleReadReceipt = (data) => {
      //actualiza el estado de los mensajes de una sola vez, en lugar de en un bucle
      //usar stateRef para acceder al estado mas reciente sin causar re-renders innecesarios
      const currentState = stateRef.current;
      setMessages(
        currentState.messages.map(msg =>
          (msg.sender_email === currentState.currentUser && msg.receiver_email === data.reader_email && !msg.is_read)
            ? { ...msg, is_read: true }
            : msg
        )
      );
    };

    //registrar handlers
    chatService.onMessage('connection_status', handleConnectionStatus);
    chatService.onMessage('message', handleNewMessage);
    chatService.onMessage('typing', handleTyping);
    chatService.onMessage('user_status', handleUserStatus);
    chatService.onMessage('read_receipt', handleReadReceipt);

    //se eliminan los listeners cuando el efecto se "limpia" para evitar duplicados y fugas de memoria.
    return () => {
      //limpiar todos los listeners para evitar fugas de memoria
      chatService.clearAllListeners();
    };
  }, [
      //se quita state.messages y se añaden las funciones que realmente se usan.
      state.selectedUser,
      state.currentUser,
      addMessage,
      setMessages,
      setUserTyping,
      setUserOnlineStatus,
      setConnectionStatus
  ]);

  //valor del contexto
  const contextValue = {
    
    //estado
    ...state,
    
    //acciones
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
    
    //funciones
    sendMessage,
    loadChatHistory,
    loadUsers,
    
    //utilidades
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