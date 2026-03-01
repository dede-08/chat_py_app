import { AxiosError } from 'axios';
import http from './httpClient';
import logger from './logger';
import { handleAxiosError, createSuccessResponse, createErrorResponse } from '../utils/errorHandler';
import { authService } from './cookieService';
import type { 
  LoginResponse, 
  UserProfile, 
  PasswordRequirements, 
  PasswordValidationResponse,
  ApiResponse,
  ApiSuccessResponse
} from '../types/api';

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
  telephone?: string;
  currentPassword?: string;
  newPassword?: string;
}

const register = (userData: RegisterData) => {
    return http.post(`${API_URL}/register`, userData);
};

export const loginUser = async (data: LoginData): Promise<ApiResponse<LoginResponse>> => {
  try {
    const response = await http.post<LoginResponse>(`${API_URL}/login`, data);
    
    //los tokens ahora se manejan via cookies desde el backend
    //solo necesitamos guardar los datos del usuario
    
    if (!response.data.email) {
      logger.error('Respuesta de login sin datos de usuario', null, { responseData: response.data });
      return createErrorResponse('El servidor no devolvió los datos necesarios');
    }
    
    //guardar datos de usuario en localStorage
    //las cookies httpOnly las establece el backend y el navegador las envia en cada request
    const username = response.data.username || response.data.email || 'Usuario';
    authService.saveUserData(response.data.email, username);
    
    logger.info('Login exitoso', { email: response.data.email });
    return createSuccessResponse(response.data);
  } catch (error) {
    const errorInfo = handleAxiosError(error as AxiosError, { operation: 'login' });
    const status = (error as AxiosError).response?.status;
    
    if (status === 404) {
      errorInfo.error = 'El usuario no existe. Por favor, regístrese.';
    } else if (status === 429) {
      errorInfo.error = 'Demasiados intentos de inicio de sesión. Por favor, espere un minuto e intente nuevamente.';
    } else if (status === 500) {
      errorInfo.error = 'Error del servidor. Por favor, intente más tarde.';
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
    logger.info('Logout exitoso desde servidor');
  } catch (error) {
    logger.warn('Error en logout (se continúa con limpieza local)', { 
      operation: 'logout',
      error: error instanceof Error ? error.message : String(error)
    });
  } finally {
    //las cookies se limpian desde el backend, pero aseguramos limpieza local
    authService.clearAll();
    logger.info('Sesión cerrada correctamente (cliente)');
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

    if (response.data?.email != null) {
      authService.saveUserData(
        response.data.email,
        response.data.username ?? authService.getUsername() ?? ''
      );
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
  return authService.getAccessToken();
};

export const getRefreshToken = (): string | null => {
  return authService.getRefreshToken();
};

export const getUserEmail = (): string | null => {
  return authService.getUserEmail();
};

export const getUsername = (): string | null => {
  return authService.getUsername();
};

export const isAuthenticated = (): boolean => {
  return authService.isAuthenticated();
};

const confirmEmail = (token: string) => {
    return http.get(`${API_URL}/confirm-email/${token}`);
};

const authServiceExports = {
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

export default authServiceExports;

