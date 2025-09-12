import { CHAT_ACTIONS } from './chatActions';

// Reducer para el estado del chat
export const chatReducer = (state, action) => {
  switch (action.type) {
    case CHAT_ACTIONS.SET_USERS:
      return { ...state, users: action.payload };
    
    case CHAT_ACTIONS.SET_SELECTED_USER:
      return { ...state, selectedUser: action.payload };
    
    case CHAT_ACTIONS.ADD_MESSAGE:
      return { 
        ...state, 
        messages: [...state.messages, action.payload] 
      };
    
    case CHAT_ACTIONS.SET_MESSAGES:
      return { ...state, messages: action.payload };
    
    case CHAT_ACTIONS.UPDATE_MESSAGE_STATUS:
      return {
        ...state,
        messages: state.messages.map(msg =>
          msg.id === action.payload.messageId
            ? { ...msg, [action.payload.field]: action.payload.value }
            : msg
        )
      };
    
    case CHAT_ACTIONS.SET_USER_TYPING: {
      const newTypingUsers = new Set(state.typingUsers);
      if (action.payload.isTyping) {
        newTypingUsers.add(action.payload.userEmail);
      } else {
        newTypingUsers.delete(action.payload.userEmail);
      }
      return { ...state, typingUsers: newTypingUsers };
    }
    
    case CHAT_ACTIONS.SET_USER_ONLINE_STATUS: {
      const newOnlineUsers = new Set(state.onlineUsers);
      if (action.payload.isOnline) {
        newOnlineUsers.add(action.payload.userEmail);
      } else {
        newOnlineUsers.delete(action.payload.userEmail);
      }
      return { ...state, onlineUsers: newOnlineUsers };
    }
    
    case CHAT_ACTIONS.SET_UNREAD_COUNT:
      return {
        ...state,
        unreadCounts: {
          ...state.unreadCounts,
          [action.payload.userEmail]: action.payload.count
        }
      };
    
    case CHAT_ACTIONS.SET_CONNECTION_STATUS:
      return { ...state, isConnected: action.payload };
    
    case CHAT_ACTIONS.SET_ERROR:
      return { ...state, error: action.payload };
    
    case CHAT_ACTIONS.CLEAR_ERROR:
      return { ...state, error: null };
    
    default:
      return state;
  }
};
