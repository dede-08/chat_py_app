import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Wifi, WifiOff, Users } from 'lucide-react';
import chatService from '../../services/chatService';
import logger from '../../services/logger';

const UserList = ({ onUserSelect, selectedUser }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  useEffect(() => {
    loadUsers();

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
      logger.error('Error al cargar usuarios', err, { operation: 'loadUsers' });
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = (user) => {
    onUserSelect(user);
  };

  return (
    <div className="w-80 flex-shrink-0 flex flex-col glass-panel rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-white/10 bg-slate-800/50 flex justify-between items-center">
        <div className="flex items-center gap-2 text-slate-100 font-semibold">
          <Users className="w-5 h-5 text-blue-400" />
          <span>Usuarios ({users.length})</span>
        </div>
        <button
          onClick={loadUsers}
          className="p-2 rounded-lg bg-slate-700/50 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
          title="Actualizar"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading ? (
          <div className="flex justify-center items-center h-32 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin" />
          </div>
        ) : error ? (
          <div className="p-4 text-red-400 text-sm">{error}</div>
        ) : (
          <AnimatePresence>
            {users.map((user) => {
              const isSelected = selectedUser?.email === user.email;
              const isOnline = onlineUsers.has(user.email);

              return (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleUserClick(user)}
                  className={`
                    flex items-center p-3 rounded-xl cursor-pointer transition-all duration-200
                    ${isSelected ? 'bg-blue-600/20 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.5)]' : 'hover:bg-slate-800/60'}
                  `}
                >
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                      {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${isOnline ? 'bg-green-500' : 'bg-slate-500'}`}></div>
                  </div>

                  <div className="ml-3 flex-1 overflow-hidden">
                    <div className="text-slate-100 font-medium truncate">{user.username || 'Usuario'}</div>
                    <div className="text-slate-400 text-xs truncate">{user.email}</div>
                  </div>

                  <div className="ml-2">
                    {isOnline ? (
                      <Wifi className="w-4 h-4 text-green-400" />
                    ) : (
                      <WifiOff className="w-4 h-4 text-slate-600" />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default UserList;
