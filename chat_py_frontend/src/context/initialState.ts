import authService from '../services/authService';
import type { ChatState } from './types';

export const initialState: ChatState = {
  users: [],
  selectedUser: null,
  messages: [],
  currentUser: authService.getUserEmail(),
  typingUsers: new Set<string>(),
  onlineUsers: new Set<string>(),
  unreadCounts: {},
  isConnected: false,
  error: null,
};
