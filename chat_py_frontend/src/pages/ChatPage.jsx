import React, { useState } from 'react';
import UserList from '../components/UserList/UserList';
import ChatArea from '../components/ChatArea/ChatArea';
import UserInfoPanel from '../components/UserInfoPanel/UserInfoPanel';

const ChatPage = () => {
  const [selectedUser, setSelectedUser] = useState(null);

  const handleUserSelect = (user) => {
    setSelectedUser(user);
  };

  return (
    <div className="flex h-screen pt-16 bg-slate-800 overflow-hidden relative">
      {/* Background Shapes */}
      <div className="bg-shape bg-blue-500/10 top-20 left-10 w-96 h-96"></div>
      <div className="bg-shape bg-indigo-500/10 bottom-20 right-1/3 w-96 h-96"></div>

      <div className="flex w-full max-w-[1600px] mx-auto h-full p-4 gap-4 relative z-10">
        <UserList onUserSelect={handleUserSelect} selectedUser={selectedUser} />

        <div className="flex-1 flex overflow-hidden bg-slate-700 rounded-2xl shadow-xl border border-slate-800">
          <ChatArea selectedUser={selectedUser} />
        </div>

        {selectedUser && <UserInfoPanel user={selectedUser} />}
      </div>
    </div>
  );
};

export default ChatPage;
