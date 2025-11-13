// src/pages/ChatPage.jsx
import React, { useState } from 'react';
import '../App.css';
import UserList from '../components/UserList/UserList';
import ChatArea from '../components/ChatArea/ChatArea';
import UserInfoPanel from '../components/UserInfoPanel/UserInfoPanel';

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
      {selectedUser && <UserInfoPanel user={selectedUser} />}
    </div>
  );
};

export default ChatPage;
