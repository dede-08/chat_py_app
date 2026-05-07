import { useContext } from 'react';
import { ChatContext } from './ChatContextProvider';

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat debe usarse dentro de un ChatProvider');
  }
  return context;
};
