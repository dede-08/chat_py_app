import { Mail, User } from 'lucide-react';
import { motion } from 'framer-motion';
import type { User as ChatUser } from '../../types';
import Avatar from '../Avatar/Avatar';

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
      <div className="mb-4">
        <Avatar src={user.avatar_url} username={user.username} size="xl" className="shadow-xl shadow-indigo-500/30" />
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
