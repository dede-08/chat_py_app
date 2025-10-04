
import React from 'react';
import './UserInfoPanel.css';

const UserInfoPanel = ({ user }) => {
  if (!user) {
    return (
      <div className="user-info-panel">
        <p>Select a user to see their information.</p>
      </div>
    );
  }

  return (
    <div className="user-info-panel">
      <div className="profile-pic-letter">
        {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
      </div>
      <h3>{user.username}</h3>
    </div>
  );
};

export default UserInfoPanel;
