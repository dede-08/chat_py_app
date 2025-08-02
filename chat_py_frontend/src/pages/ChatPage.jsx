// src/pages/ChatPage.jsx
import React, { useState } from 'react';
import '../App.css'; // para mantener fondo gris

const ChatPage = () => {
  const [selectedUser, setSelectedUser] = useState(null);

  const usersOnline = ['Alice', 'Bob', 'Charlie']; // Simulado, luego irá desde WebSocket

  return (
    <div className="chat-container">
      <aside className="sidebar bg-dark">
        <h5 className='text-white'>Usuarios conectados</h5>
        <ul className="user-list">
          {usersOnline.map((user) => (
            <li key={user} onClick={() => setSelectedUser(user)} className={selectedUser === user ? 'selected' : ''}>
              {user}
            </li>
          ))}
        </ul>
      </aside>

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
          <p>Selecciona un usuario para empezar a chatear</p>
        )}
      </main>
    </div>
  );
};

export default ChatPage;
