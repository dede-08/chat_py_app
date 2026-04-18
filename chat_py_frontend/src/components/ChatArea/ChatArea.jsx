import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, AlertTriangle, MessageSquare } from 'lucide-react';
import chatService from '../../services/chatService';
import authService from '../../services/authService';
import logger from '../../services/logger';
import { validateChatMessage } from '../../utils/validators';
import { sanitizeChatMessage } from '../../utils/sanitizer';

const ChatArea = ({ selectedUser }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [messageError, setMessageError] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const currentUserEmail = authService.getUserEmail();

  const loadChatHistory = useCallback(async () => {
    if (!selectedUser) return;
    try {
      setLoading(true); setError(null);
      const history = await chatService.getChatHistory(selectedUser.email);
      setMessages(history);
    } catch (error) {
      logger.error('Error al cargar historial', error, { selectedUser: selectedUser?.email });
      setError('No se pudo cargar el historial.');
    } finally {
      setLoading(false);
    }
  }, [selectedUser]);

  const handleNewMessage = useCallback((data) => {
    if (data.sender_email === selectedUser?.email) {
      setMessages(prev => [...prev, data]);
      chatService.sendReadReceipt(data.sender_email);
    }
  }, [selectedUser]);

  const handleTypingIndicator = useCallback((data) => {
    if (data.sender_email === selectedUser?.email) {
      setOtherUserTyping(data.is_typing);
    }
  }, [selectedUser]);

  const handleReadReceipt = useCallback((data) => {
    setMessages(prev => prev.map(msg =>
      msg.sender_email === currentUserEmail && msg.receiver_email === data.reader_email ? { ...msg, is_read: true } : msg
    ));
  }, [currentUserEmail]);

  useEffect(() => {
    if (selectedUser) {
      loadChatHistory();
      chatService.markMessagesAsRead(selectedUser.email);
    }
  }, [selectedUser, loadChatHistory]);

  useEffect(() => {
    chatService.onMessage('message', handleNewMessage);
    chatService.onMessage('typing', handleTypingIndicator);
    chatService.onMessage('read_receipt', handleReadReceipt);
    return () => {
      chatService.offMessage('message', handleNewMessage);
      chatService.offMessage('typing', handleTypingIndicator);
      chatService.offMessage('read_receipt', handleReadReceipt);
    };
  }, [handleNewMessage, handleTypingIndicator, handleReadReceipt]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, otherUserTyping]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    const validation = validateChatMessage(newMessage);
    if (!validation.isValid) {
      setMessageError(validation.error); setTimeout(() => setMessageError(null), 5000); return;
    }
    const sanitizedMessage = sanitizeChatMessage(newMessage.trim());
    if (!sanitizedMessage) return;

    const messageData = {
      id: Date.now().toString(), sender_email: currentUserEmail, receiver_email: selectedUser.email,
      content: sanitizedMessage, timestamp: new Date().toISOString(), is_read: false
    };

    setMessages(prev => [...prev, messageData]);
    chatService.sendMessage(selectedUser.email, sanitizedMessage);
    setNewMessage(''); setMessageError(null); setIsTyping(false);
    chatService.sendTypingIndicator(selectedUser.email, false);
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    const validation = validateChatMessage(value);
    setMessageError(!validation.isValid && value.length > 0 ? validation.error : null);
    setNewMessage(value);

    if (!isTyping) {
      setIsTyping(true); chatService.sendTypingIndicator(selectedUser?.email, true);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false); chatService.sendTypingIndicator(selectedUser?.email, false);
    }, 1000);
  };

  const formatTime = (ts) => new Date(ts).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  if (!selectedUser) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-700">
        <MessageSquare className="w-16 h-16 mb-4 text-slate-500 opacity-50" />
        <h3 className="text-xl font-medium text-slate-300">Selecciona un usuario</h3>
        <p className="mt-2 text-slate-500">Elige un usuario de la lista para comenzar a chatear.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-slate-800">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-700 flex items-center z-10 shadow-sm">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold mr-3 shadow-md">
          {selectedUser.username ? selectedUser.username.charAt(0).toUpperCase() : 'U'}
        </div>
        <div>
          <h3 className="text-slate-100 font-semibold">{selectedUser.username || selectedUser.email}</h3>
          <span className="text-slate-400 text-xs">{selectedUser.email}</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-700">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex justify-between items-center">
            <span className="flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error}</span>
            <button onClick={loadChatHistory} className="px-3 py-1 bg-red-500/20 rounded-md hover:bg-red-500/30">Reintentar</button>
          </div>
        )}

        {loading ? (
          <div className="h-full flex items-center justify-center text-slate-400">Cargando mensajes...</div>
        ) : (
          <AnimatePresence>
            {messages.map((message) => {
              const isSent = message.sender_email === currentUserEmail;
              return (
                <motion.div
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  key={message.id}
                  className={`flex flex-col max-w-[75%] ${isSent ? 'self-end items-end ml-auto' : 'self-start items-start mr-auto'}`}
                >
                  <div className={`px-4 py-2 rounded-2xl ${isSent ? 'bg-blue-600 text-white rounded-br-none shadow-blue-500/20 shadow-sm' : 'bg-slate-800 text-slate-100 rounded-bl-none shadow-sm'}`}>
                    <p className="break-words">{message.content}</p>
                  </div>
                  <div className="flex items-center gap-1 mt-1 px-1">
                    <span className="text-xs text-slate-500">{formatTime(message.timestamp)}</span>
                    {isSent && (
                      <span className={`text-xs ml-1 ${message.is_read ? 'text-blue-400' : 'text-slate-500'}`}>
                        {message.is_read ? '✓✓' : '✓'}
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
            {otherUserTyping && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex self-start items-center p-3 bg-slate-800 rounded-2xl rounded-bl-none text-slate-400 text-sm w-max">
                Escribiendo<span className="animate-pulse ml-1">...</span>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </AnimatePresence>
        )}
      </div>

      {/* Input Form */}
      <div className="p-4 bg-slate-700 border-t border-slate-800">
        <form onSubmit={handleSendMessage} className="relative">
          {messageError && <div className="absolute -top-8 left-0 text-red-400 text-xs bg-slate-900/80 px-2 py-1 rounded">{messageError}</div>}
          <div className="flex gap-2 items-end">
            <div className="flex-1 relative">
              <input
                type="text"
                value={newMessage}
                onChange={handleInputChange}
                placeholder="Escribe un mensaje..."
                disabled={!selectedUser}
                maxLength={5000}
                className="w-full bg-slate-800 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
              />
            </div>
            <button
              type="submit"
              disabled={!newMessage.trim() || !selectedUser || !!messageError}
              className="bg-blue-600 disabled:opacity-50 disabled:hover:bg-blue-600 hover:bg-blue-500 text-white rounded-xl p-3 shadow-sm transition-all flex items-center justify-center shrink-0"
            >
              <Send className="w-5 h-5 ml-1" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatArea;
