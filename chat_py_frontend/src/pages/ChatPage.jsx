// src/pages/ChatPage.jsx
import React, { useState } from 'react';
import '../App.css';
import UserList from '../components/user-list-component/UserList';
import ChatArea from '../components/chat-area-component/ChatArea';

const ChatPage = () => {
  const [selectedUser, setSelectedUser] = useState(null);

  const handleUserSelect = (user) => {
    setSelectedUser(user);
  };

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
