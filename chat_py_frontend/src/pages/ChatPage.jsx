// src/pages/ChatPage.jsx
import React, { useState, useEffect } from 'react';
import '../App.css';
import UserList from '../components/user-list-component/UserList';
import ChatArea from '../components/chat-area-component/ChatArea';
import chatService from '../services/chatService';
import authService from '../services/authService';

const ChatPage = () => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [connectionError, setConnectionError] = useState(null);

  useEffect(() => {
    //verificar si el usuario está autenticado
    const token = authService.getToken();
    if (!token) {
      setConnectionError('No hay token de autenticación disponible');
      return;
    }

    //conectar websocket con manejo de errores
    try {
      chatService.connect();
      
      //escuchar eventos de conexión
      const handleConnectionChange = (connected) => {
        if (!connected) {
          setConnectionError('Conexión perdida. Intentando reconectar...');
        } else {
          setConnectionError(null);
        }
      };

      //configurar manejadores de eventos del WebSocket
      chatService.onMessage('connection_status', (data) => {
        handleConnectionChange(data.connected);
      });

      //conexion establecida
    } catch (error) {
      console.error('Error al conectar WebSocket:', error);
      setConnectionError('Error al conectar con el servidor');
    }

    //limpiar conexion al desmontar
    return () => {
      try {
        chatService.disconnect();
      } catch (error) {
        console.error('Error al desconectar:', error);
      }
    };
  }, []);

  const handleUserSelect = (user) => {
    setSelectedUser(user);
  };

  //mostrar error de conexión si existe
  if (connectionError) {
    return (
      <div className="chat-container">
        <UserList onUserSelect={handleUserSelect} selectedUser={selectedUser} />
        <div className="chat-main">
          <div className="connection-error">
            <h3>Error de Conexión</h3>
            <p>{connectionError}</p>
            <button onClick={() => window.location.reload()}>
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <UserList onUserSelect={handleUserSelect} selectedUser={selectedUser} />
      <div className="chat-main">
        <ChatArea selectedUser={selectedUser} />
      </div>
    </div>
  );
};

export default ChatPage;
