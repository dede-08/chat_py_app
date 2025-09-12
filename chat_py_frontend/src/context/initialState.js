import authService from '../services/authService';

// Estado inicial para el contexto de chat
export const initialState = {
  users: [],
  selectedUser: null,
  messages: [],
  currentUser: authService.getUserEmail(),
  typingUsers: new Set(),
  onlineUsers: new Set(),
  unreadCounts: {},
  isConnected: false,
  error: null
};
