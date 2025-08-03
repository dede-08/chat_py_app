// src/pages/ChatPage.jsx
import React, { useState } from 'react';
import '../App.css'; // para mantener fondo gris
import { Router } from 'react-router-dom';
import Sidebar from '../components/sidebar-component/Sidebar';

const ChatPage = () => {
  const [selectedUser] = useState(null);

  return (
    <div className="chat-container">
      <Sidebar />
      <main className="chat-window">
        {selectedUser ? (
          <>
            <h5>Chat con {selectedUser}</h5>
            <div className="messages">
              {/* Aquí irán los mensajes */}
            </div>
            <form className="message-form">
              <input type="text" placeholder="Escribe un mensaje..." />
              <button type="submit">Enviar</button>
            </form>
          </>
        ) : (
          <p className='text-white'>Selecciona un usuario para empezar a chatear</p>
        )}
      </main>
    </div>
  );
};

export default ChatPage;
