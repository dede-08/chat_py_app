import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import logger from './logger';
import { handleAxiosError, createSuccessResponse, createErrorResponse } from '../utils/errorHandler';
import type { 
  LoginResponse, 
  UserProfile, 
  PasswordRequirements, 
  PasswordValidationResponse,
  ApiResponse,
  ApiSuccessResponse,
  RefreshTokenResponse
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

interface RefreshTokenData {
  refresh_token: string;
}

const register = (userData: RegisterData) => {
    return axios.post(`${API_URL}/register`, userData);
};

export const loginUser = async (data: LoginData): Promise<ApiResponse<LoginResponse>> => {
  try {
    const response = await axios.post<LoginResponse>(`${API_URL}/login`, data);
    
    //verificar que la respuesta tenga los tokens
    if (!response.data.access_token || !response.data.refresh_token) {
      logger.error('Respuesta de login sin tokens', null, { responseData: response.data });
      return createErrorResponse('El servidor no devolvió los tokens necesarios');
    }
    
    //guardar access_token y refresh_token
    localStorage.setItem('access_token', response.data.access_token);
    localStorage.setItem('refresh_token', response.data.refresh_token);
    // Mantener compatibilidad con código antiguo que usa 'token'
    localStorage.setItem('token', response.data.access_token);
    localStorage.setItem('userEmail', response.data.email);
    //guardar el username del usuario logueado (con fallback al email si no hay username)
    const username = response.data.username || response.data.email || 'Usuario';
    localStorage.setItem('username', username);
    
    //verificar que se guardaron correctamente
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
    
    // Mensajes específicos para login
    if ((error as AxiosError).response?.status === 404) {
      errorInfo.error = 'El usuario no existe. Por favor, regístrese.';
    }
    
    return errorInfo;
  }
};

//obtener requisitos de contraseña
export const getPasswordRequirements = async (): Promise<ApiSuccessResponse<PasswordRequirements>> => {
  try {
    const response = await axios.get<PasswordRequirements>(`${API_URL}/password-requirements`);
    return createSuccessResponse(response.data);
  } catch (error) {
    logger.error('Error al obtener requisitos de contraseña', error instanceof Error ? error : null, { operation: 'getPasswordRequirements' });
    throw error; //lanzar el error para que el componente lo maneje
  }
};

//validar contraseña
export const validatePassword = async (password: string): Promise<ApiResponse<PasswordValidationResponse>> => {
  try {
    const response = await axios.post<PasswordValidationResponse>(`${API_URL}/validate-password`, { password });
    return createSuccessResponse(response.data);
  } catch (error) {
    const errorInfo = handleAxiosError(error as AxiosError, { operation: 'validatePassword' });
    return createErrorResponse(errorInfo.error || 'Error al validar contraseña');
  }
};

//logout
export const logoutUser = async (): Promise<void> => {
  try {
    const token = getToken();
    if (token) {
      await axios.post(`${API_URL}/logout`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      logger.info('Logout exitoso');
    }
  } catch (error) {
    // No lanzar error en logout, solo loguear
    logger.warn('Error en logout (se continúa con limpieza)', { 
      operation: 'logout',
      error: error instanceof Error ? error.message : String(error)
    });
  } finally {
    //limpiar localStorage independientemente del resultado
    localStorage.removeItem('token');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('username');
  }
};

//obtener perfil completo del usuario
export const getUserProfile = async (): Promise<ApiResponse<UserProfile>> => {
  try {
    const token = getToken();
    const response = await axios.get<UserProfile>(`${API_URL}/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return createSuccessResponse(response.data);
  } catch (error) {
    const errorInfo = handleAxiosError(error as AxiosError, { operation: 'getUserProfile' });
    
    // Limpiar localStorage si el token expiró
    if ((error as AxiosError).response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('username');
    }
    
    // Mensajes específicos
    if ((error as AxiosError).response?.status === 404) {
      errorInfo.error = 'Perfil no encontrado.';
    }
    
    return errorInfo;
  }
};

//actualizar perfil del usuario
export const updateUserProfile = async (data: UpdateProfileData): Promise<ApiResponse<UserProfile>> => {
  try {
    const token = getToken();
    const response = await axios.put<UserProfile>(`${API_URL}/profile`, data, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    //actualizar localStorage con los nuevos datos del usuario
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
    
    // Limpiar localStorage si el token expiró
    if ((error as AxiosError).response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('username');
    }
    
    // Mensajes específicos
    if ((error as AxiosError).response?.status === 409) {
      errorInfo.error = 'El nombre de usuario o correo ya está en uso.';
    } else if ((error as AxiosError).response?.status === 422) {
      errorInfo.error = 'Los datos proporcionados no son válidos.';
    }
    
    return errorInfo;
  }
};

//obtener access token del localStorage
export const getToken = (): string | null => {
  // Priorizar access_token, pero mantener compatibilidad con 'token' antiguo
  return localStorage.getItem('access_token') || localStorage.getItem('token');
};

//obtener refresh token del localStorage
export const getRefreshToken = (): string | null => {
  return localStorage.getItem('refresh_token');
};

//renovar tokens usando refresh token
export const refreshTokens = async (): Promise<RefreshTokenResponse & { success: true }> => {
  try {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      const error = new Error('No hay refresh token disponible');
      logger.error('No hay refresh token disponible', error, { operation: 'refreshTokens' });
      throw error;
    }

    const response = await axios.post<RefreshTokenResponse>(`${API_URL}/refresh`, {
      refresh_token: refreshToken
    } as RefreshTokenData);

    //guardar nuevos tokens
    localStorage.setItem('access_token', response.data.access_token);
    localStorage.setItem('refresh_token', response.data.refresh_token);
    //mantener compatibilidad
    localStorage.setItem('token', response.data.access_token);

    logger.debug('Tokens renovados exitosamente', { operation: 'refreshTokens' });
    return {
      success: true,
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token
    };
  } catch (error) {
    logger.error('Error al renovar tokens', error as Error, { operation: 'refreshTokens' });
    //si el refresh token es invalido, limpiar todo y forzar nuevo login
    await logoutUser();
    throw error;
  }
};

//obtener email del usuario
export const getUserEmail = (): string | null => {
  return localStorage.getItem('userEmail');
};

//obtener username del usuario
export const getUsername = (): string | null => {
  return localStorage.getItem('username');
};

//verificar si el usuario está autenticado
export const isAuthenticated = (): boolean => {
  return !!getToken();
};

const confirmEmail = (token: string) => {
    return axios.get(`${API_URL}/confirm-email/${token}`);
};

//configurar interceptor de axios para renovar tokens automaticamente
let isRefreshing = false;
interface QueueItem {
  resolve: (token: string | null) => void;
  reject: (error: unknown) => void;
}
let failedQueue: QueueItem[] = [];

const processQueue = (error: unknown, token: string | null = null): void => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

axios.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    //si el error es 401 y no es una peticion de refresh o login
    if (error.response?.status === 401 && 
        !originalRequest._retry && 
        !originalRequest.url?.includes('/refresh') &&
        !originalRequest.url?.includes('/login')) {
      
      if (isRefreshing) {
        //si ya se esta refrescando, esperar en la cola
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            if (originalRequest.headers) {
              originalRequest.headers['Authorization'] = `Bearer ${token}`;
            }
            return axios(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newTokens = await refreshTokens();
        processQueue(null, newTokens.access_token);
        if (originalRequest.headers) {
          originalRequest.headers['Authorization'] = `Bearer ${newTokens.access_token}`;
        }
        return axios(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        //redirigir a login si el refresh falla
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

//crear instancia por defecto para compatibilidad
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
    refreshTokens,
    getUserEmail,
    getUsername,
    getUserProfile,
    updateUserProfile
};

