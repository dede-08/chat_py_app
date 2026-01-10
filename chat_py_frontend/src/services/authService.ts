import { AxiosError } from 'axios';
import http from './httpClient';
import logger from './logger';
import { handleAxiosError, createSuccessResponse, createErrorResponse } from '../utils/errorHandler';
import type { 
  LoginResponse, 
  UserProfile, 
  PasswordRequirements, 
  PasswordValidationResponse,
  ApiResponse,
  ApiSuccessResponse
} from '../types';

const API_URL = `${import.meta.env.VITE_API_URL}/auth`;

interface RegisterData {
  email: string;
  username: string;
  password: string;
  telephone: string;
}

interface LoginData {
  email: string;
  password: string;
}

interface UpdateProfileData {
  username?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
}

const register = (userData: RegisterData) => {
    return http.post(`${API_URL}/register`, userData);
};

export const loginUser = async (data: LoginData): Promise<ApiResponse<LoginResponse>> => {
  try {
    const response = await http.post<LoginResponse>(`${API_URL}/login`, data);
    
    if (!response.data.access_token || !response.data.refresh_token) {
      logger.error('Respuesta de login sin tokens', null, { responseData: response.data });
      return createErrorResponse('El servidor no devolvió los tokens necesarios');
    }
    
    localStorage.setItem('access_token', response.data.access_token);
    localStorage.setItem('refresh_token', response.data.refresh_token);
    //compatibilidad con codigo antiguo que usa 'token'
    localStorage.setItem('token', response.data.access_token);
    localStorage.setItem('userEmail', response.data.email);
    const username = response.data.username || response.data.email || 'Usuario';
    localStorage.setItem('username', username);
    
    const savedToken = localStorage.getItem('access_token');
    if (!savedToken) {
      logger.error('El token no se guardó correctamente en localStorage', null, { 
        hasAccessToken: !!response.data.access_token 
      });
    }
    
    logger.info('Login exitoso', { email: response.data.email });
    return createSuccessResponse(response.data);
  } catch (error) {
    const errorInfo = handleAxiosError(error as AxiosError, { operation: 'login' });
    if ((error as AxiosError).response?.status === 404) {
      errorInfo.error = 'El usuario no existe. Por favor, regístrese.';
    }
    return errorInfo;
  }
};

export const getPasswordRequirements = async (): Promise<ApiSuccessResponse<PasswordRequirements>> => {
  try {
    const response = await http.get<PasswordRequirements>(`${API_URL}/password-requirements`);
    return createSuccessResponse(response.data);
  } catch (error) {
    logger.error('Error al obtener requisitos de contraseña', error instanceof Error ? error : null, { operation: 'getPasswordRequirements' });
    throw error;
  }
};

export const validatePassword = async (password: string): Promise<ApiResponse<PasswordValidationResponse>> => {
  try {
    const response = await http.post<PasswordValidationResponse>(`${API_URL}/validate-password`, { password });
    return createSuccessResponse(response.data);
  } catch (error) {
    const errorInfo = handleAxiosError(error as AxiosError, { operation: 'validatePassword' });
    return createErrorResponse(errorInfo.error || 'Error al validar contraseña');
  }
};

export const logoutUser = async (): Promise<void> => {
  try {
    await http.post(`${API_URL}/logout`, {});
    logger.info('Logout exitoso');
  } catch (error) {
    logger.warn('Error en logout (se continúa con limpieza)', { 
      operation: 'logout',
      error: error instanceof Error ? error.message : String(error)
    });
  } finally {
    localStorage.removeItem('token');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('username');
  }
};

export const getUserProfile = async (): Promise<ApiResponse<UserProfile>> => {
  try {
    const response = await http.get<UserProfile>(`${API_URL}/profile`);
    return createSuccessResponse(response.data);
  } catch (error) {
    const errorInfo = handleAxiosError(error as AxiosError, { operation: 'getUserProfile' });
    if ((error as AxiosError).response?.status === 404) {
      errorInfo.error = 'Perfil no encontrado.';
    }
    return errorInfo;
  }
};

export const updateUserProfile = async (data: UpdateProfileData): Promise<ApiResponse<UserProfile>> => {
  try {
    const response = await http.put<UserProfile>(`${API_URL}/profile`, data);
    if (data.username) {
      localStorage.setItem('username', data.username);
    }
    if (data.email) {
      localStorage.setItem('userEmail', data.email);
    }
    logger.info('Perfil actualizado exitosamente', { updatedFields: Object.keys(data) });
    return createSuccessResponse(response.data);
  } catch (error) {
    const errorInfo = handleAxiosError(error as AxiosError, { operation: 'updateUserProfile' });
    if ((error as AxiosError).response?.status === 409) {
      errorInfo.error = 'El nombre de usuario o correo ya está en uso.';
    } else if ((error as AxiosError).response?.status === 422) {
      errorInfo.error = 'Los datos proporcionados no son válidos.';
    }
    return errorInfo;
  }
};

export const getToken = (): string | null => {
  return localStorage.getItem('access_token') || localStorage.getItem('token');
};

export const getRefreshToken = (): string | null => {
  return localStorage.getItem('refresh_token');
};

export const getUserEmail = (): string | null => {
  return localStorage.getItem('userEmail');
};

export const getUsername = (): string | null => {
  return localStorage.getItem('username');
};

export const isAuthenticated = (): boolean => {
  return !!getToken();
};

const confirmEmail = (token: string) => {
    return http.get(`${API_URL}/confirm-email/${token}`);
};

export default {
    register,
    loginUser,
    logoutUser,
    isAuthenticated,
    validatePassword,
    getPasswordRequirements,
    confirmEmail,
    getToken,
    getRefreshToken,
    getUserEmail,
    getUsername,
    getUserProfile,
    updateUserProfile
};

