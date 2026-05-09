import { User, Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import type { User as ChatUser } from '../../types';

interface UserInfoPanelProps {
  user: ChatUser;
}

const UserInfoPanel = ({ user }: UserInfoPanelProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-72 flex-shrink-0 flex flex-col items-center p-6 glass-panel rounded-2xl"
    >
      <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-4xl shadow-xl shadow-indigo-500/30 mb-4 relative">
        {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
      </div>

      <h3 className="text-xl font-bold text-slate-100 mb-1 truncate w-full text-center">{user.username}</h3>

      <span className="bg-slate-800/80 px-3 py-1 rounded-full text-xs text-blue-400 font-medium mb-8">Usuario Registrado</span>

      <div className="w-full space-y-4">
        <div className="flex items-center gap-3 text-slate-300 bg-slate-800/40 p-3 rounded-xl">
          <Mail className="w-5 h-5 text-indigo-400 shrink-0" />
          <div className="flex flex-col overflow-hidden">
            <span className="text-xs text-slate-500">Correo Electrónico</span>
            <span className="text-sm truncate">{user.email}</span>
          </div>
        </div>

        {user.telephone && (
          <div className="flex items-center gap-3 text-slate-300 bg-slate-800/40 p-3 rounded-xl">
            <User className="w-5 h-5 text-indigo-400 shrink-0" />
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs text-slate-500">Teléfono</span>
              <span className="text-sm">{user.telephone}</span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default UserInfoPanel;
