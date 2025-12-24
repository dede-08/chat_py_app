/**
 * Tipos para las respuestas de la API
 */

// Tipos de autenticación
export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  email: string;
  username?: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
}

export interface UserProfile {
  id?: string;
  email: string;
  username: string;
  telephone?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PasswordRequirements {
  min_length: number;
  max_length: number;
  require_uppercase: boolean;
  require_lowercase: boolean;
  require_digits: boolean;
  require_special_chars: boolean;
  special_chars?: string;
}

export interface PasswordValidationResponse {
  is_valid: boolean;
  errors?: string[];
}

// Tipos de chat
export interface ChatMessage {
  id: string;
  sender_email: string;
  receiver_email: string;
  content: string;
  timestamp: string;
  is_read: boolean;
}

export interface ChatRoom {
  other_user_email: string;
  other_user_username?: string;
  last_message?: ChatMessage;
  unread_count: number;
}

export interface User {
  id: string;
  email: string;
  username?: string;
  is_online?: boolean;
}

// Tipos de respuesta estándar
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  timestamp?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  errorType?: string;
  statusCode?: number;
  rawMessage?: string;
  timestamp?: string;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// Tipos de WebSocket
export interface WebSocketMessage {
  type: string;
  [key: string]: unknown;
}

export interface WebSocketChatMessage extends WebSocketMessage {
  type: 'message';
  id: string;
  sender_email: string;
  receiver_email: string;
  content: string;
  timestamp: string;
  is_read: boolean;
}

export interface WebSocketTypingMessage extends WebSocketMessage {
  type: 'typing';
  sender_email: string;
  receiver_email: string;
  is_typing: boolean;
}

export interface WebSocketReadReceipt extends WebSocketMessage {
  type: 'read_receipt';
  sender_email: string;
  reader_email: string;
}

export interface WebSocketConnectionStatus extends WebSocketMessage {
  type: 'connection_status';
  connected: boolean;
}

export interface WebSocketMessageSent extends WebSocketMessage {
  type: 'message_sent';
  message_id: string;
}

export interface WebSocketUserStatus extends WebSocketMessage {
  type: 'user_status';
  user_email: string;
  is_online: boolean;
}

export interface WebSocketError extends WebSocketMessage {
  type: 'error';
  message: string;
}

