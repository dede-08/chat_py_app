import React, { Component, useState } from "react"
import { Link } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './Sidebar.css';

const Sidebar = () => {
  const [selectedUser, setSelectedUser] = useState(null);

  const usersOnline = ['Alice', 'Bob', 'Charlie']; //simulado, luego ira desde WebSocket

  return (
    <div className="sidebar">
      <aside className="sidebar bg-dark">
        <h5 className='text-white'>Online</h5>
        <ul className="user-list">
          {usersOnline.map((user) => (
            <li key={user} onClick={() => setSelectedUser(user)} className={selectedUser === user ? 'selected' : ''}>
              {user}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  )
}

export default Sidebar;