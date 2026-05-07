import type { ChatMessage, User } from '../types';

export interface ChatState {
  users: User[];
  selectedUser: User | null;
  messages: ChatMessage[];
  currentUser: string | null;
  typingUsers: Set<string>;
  onlineUsers: Set<string>;
  unreadCounts: Record<string, number>;
  isConnected: boolean;
  error: string | null;
}

export interface UpdateMessageStatusPayload {
  messageId: string;
  field: keyof ChatMessage;
  value: ChatMessage[keyof ChatMessage];
}

export type ChatAction =
  | { type: 'SET_USERS'; payload: User[] }
  | { type: 'SET_SELECTED_USER'; payload: User | null }
  | { type: 'ADD_MESSAGE'; payload: ChatMessage }
  | { type: 'SET_MESSAGES'; payload: ChatMessage[] }
  | { type: 'UPDATE_MESSAGE_STATUS'; payload: UpdateMessageStatusPayload }
  | { type: 'SET_USER_TYPING'; payload: { userEmail: string; isTyping: boolean } }
  | { type: 'SET_USER_ONLINE_STATUS'; payload: { userEmail: string; isOnline: boolean } }
  | { type: 'SET_UNREAD_COUNT'; payload: { userEmail: string; count: number } }
  | { type: 'SET_CONNECTION_STATUS'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ERROR' };

export interface ChatContextValue extends ChatState {
  setUsers: (users: User[]) => void;
  setSelectedUser: (user: User | null) => void;
  addMessage: (message: ChatMessage) => void;
  setMessages: (messages: ChatMessage[]) => void;
  updateMessageStatus: (messageId: string, field: keyof ChatMessage, value: ChatMessage[keyof ChatMessage]) => void;
  setUserTyping: (userEmail: string, isTyping: boolean) => void;
  setUserOnlineStatus: (userEmail: string, isOnline: boolean) => void;
  setUnreadCount: (userEmail: string, count: number) => void;
  setConnectionStatus: (isConnected: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  sendMessage: (content: string) => boolean;
  loadChatHistory: (userEmail: string) => Promise<ChatMessage[]>;
  loadUsers: () => Promise<User[]>;
  sendTypingIndicator: (receiverEmail: string, isTyping: boolean) => void;
  markMessagesAsRead: (senderEmail: string) => Promise<void>;
  isUserOnline: (userEmail: string) => boolean;
  isUserTyping: (userEmail: string) => boolean;
  getUnreadCount: (userEmail: string) => number;
}
