import React, { useState, useEffect, useRef, useCallback } from 'react';
import chatService from '../../services/chatService';
import authService from '../../services/authService';
import './ChatArea.css';

const ChatArea = ({ selectedUser }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const currentUserEmail = authService.getUserEmail();

  const loadChatHistory = useCallback(async () => {
    if (!selectedUser) return;

    try {
      setLoading(true);
      const history = await chatService.getChatHistory(selectedUser.email);
      setMessages(history);
    } catch (error) {
      console.error('Error al cargar historial:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedUser]);

  const handleNewMessage = useCallback((data) => {
    if (data.sender_email === selectedUser?.email) {
      setMessages(prev => [...prev, data]);
      //marcar como leido
      chatService.sendReadReceipt(data.sender_email);
    }
  }, [selectedUser]);

  const handleTypingIndicator = useCallback((data) => {
    if (data.sender_email === selectedUser?.email) {
      setOtherUserTyping(data.is_typing);
    }
  }, [selectedUser]);

  const handleReadReceipt = useCallback((data) => {
    //actualizar estado de lectura de mensajes
    setMessages(prev => 
      prev.map(msg => 
        msg.sender_email === currentUserEmail && msg.receiver_email === data.reader_email
          ? { ...msg, is_read: true }
          : msg
      )
    );
  }, [currentUserEmail]);

  useEffect(() => {
    if (selectedUser) {
      loadChatHistory();
      //marcar mensajes como leidos
      chatService.markMessagesAsRead(selectedUser.email);
    }
  }, [selectedUser, loadChatHistory]);

  useEffect(() => {
    //configurar manejadores de mensajes
    chatService.onMessage('message', handleNewMessage);
    chatService.onMessage('typing', handleTypingIndicator);
    chatService.onMessage('read_receipt', handleReadReceipt);
    chatService.onMessage('message_sent', handleMessageSent);

    return () => {
      //limpiar manejadores
      chatService.messageHandlers.clear();
    };
  }, [handleNewMessage, handleTypingIndicator, handleReadReceipt]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleMessageSent = (data) => {
    //mensaje enviado exitosamente
    console.log('Mensaje enviado:', data.message_id);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;

    const messageData = {
      id: Date.now().toString(), //id temporal
      sender_email: currentUserEmail,
      receiver_email: selectedUser.email,
      content: newMessage.trim(),
      timestamp: new Date().toISOString(),
      is_read: false
    };

    //agregar mensaje localmente inmediatamente
    setMessages(prev => [...prev, messageData]);
    
    //enviar mensaje
    chatService.sendMessage(selectedUser.email, newMessage.trim());
    
    //limpiar input
    setNewMessage('');
    
    //detener indicador de escritura
    setIsTyping(false);
    chatService.sendTypingIndicator(selectedUser.email, false);
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    
    //manejar indicador de escritura
    if (!isTyping) {
      setIsTyping(true);
      chatService.sendTypingIndicator(selectedUser?.email, true);
    }
    
    //limpiar timeout anterior
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    //configurar nuevo timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      chatService.sendTypingIndicator(selectedUser?.email, false);
    }, 1000);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (!selectedUser) {
    return (
      <div className="chat-area">
        <div className="no-chat-selected">
          <div className="no-chat-icon"><span className="material-symbols-outlined text-primary fs-1">chat_bubble</span></div>
          <h3>Selecciona un usuario para empezar a chatear</h3>
          <p>Elige un usuario de la lista para comenzar una conversación</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-area">
      <div className="chat-header">
        <div className="chat-user-info">
          <div className="chat-user-avatar">
            {selectedUser.username ? selectedUser.username.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <h3>{selectedUser.username || selectedUser.email}</h3>
            <span className="user-email">{selectedUser.email}</span>
          </div>
        </div>
      </div>

      <div className="messages-container">
        {loading ? (
          <div className="loading-messages">Cargando mensajes...</div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`message ${message.sender_email === currentUserEmail ? 'sent' : 'received'}`}
              >
                <div className="message-content">
                  <p>{message.content}</p>
                  <div className="message-meta">
                    <span className="message-time">
                      {formatTime(message.timestamp)}
                    </span>
                    {message.sender_email === currentUserEmail && (
                      <span className="message-status">
                        {message.is_read ? '✓✓' : '✓'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {otherUserTyping && (
              <div className="typing-indicator">
                <span>{selectedUser.username || selectedUser.email} está escribiendo...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <form className="message-form" onSubmit={handleSendMessage}>
        <div className="input-container">
          <input
            type="text"
            value={newMessage}
            onChange={handleInputChange}
            placeholder="Escribe un mensaje..."
            disabled={!selectedUser}
          />
          <button type="submit" disabled={!newMessage.trim() || !selectedUser}>
            Enviar
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatArea;
