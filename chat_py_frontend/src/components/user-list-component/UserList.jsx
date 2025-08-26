import React, { useState, useEffect } from 'react';
import chatService from '../../services/chatService';
import './UserList.css';

const UserList = ({ onUserSelect, selectedUser }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  useEffect(() => {
    loadUsers();
    
    // Escuchar cambios de estado de usuarios
    chatService.onMessage('user_status', (data) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        if (data.is_online) {
          newSet.add(data.user_email);
        } else {
          newSet.delete(data.user_email);
        }
        return newSet;
      });
    });
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersData = await chatService.getUsers();
      setUsers(usersData);
    } catch (err) {
      setError('Error al cargar usuarios');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = (user) => {
    onUserSelect(user);
  };

  if (loading) {
    return (
      <div className="user-list">
        <div className="user-list-header">
          <h3>Online</h3>
        </div>
        <div className="loading">Cargando usuarios...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="user-list">
        <div className="user-list-header">
          <h3>Usuarios</h3>
        </div>
        <div className="error">{error}</div>
      </div>
    );
  }

  return (
    <div className="user-list">
      <div className="user-list-header">
        <h3>Usuarios ({users.length})</h3>
        <button onClick={loadUsers} className="refresh-btn">
          🔄
        </button>
      </div>
      <div className="users-container">
        {users.map((user) => (
          <div
            key={user.id}
            className={`user-item ${selectedUser?.email === user.email ? 'selected' : ''}`}
            onClick={() => handleUserClick(user)}
          >
            <div className="user-avatar">
              {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="user-info">
              <div className="user-name">{user.username || user.email}</div>
              <div className="user-email">{user.email}</div>
            </div>
            <div className={`user-status ${onlineUsers.has(user.email) ? 'online' : 'offline'}`}>
              {onlineUsers.has(user.email) ? '🟢' : '⚫'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserList;
