import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import logger from './logger';
import { authService } from './cookieService';
import type { RefreshTokenResponse } from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_URL as string;

if (localStorage.getItem('access_token') && !authService.hasAccessToken()) {
  authService.migrateFromLocalStorage();
  logger.info('Tokens migrados desde localStorage a cookies');
}

//utilidades internas para tokens (ahora seguras)
const getAccessToken = (): string | null => {
  return authService.getAccessToken();
};

const getRefreshToken = (): string | null => {
  return authService.getRefreshToken();
};

const clearAuthStorage = (): void => {
  authService.clearAll();
};

const http = axios.create({ 
  baseURL: API_BASE_URL,
  withCredentials: true  //importante para cookies en CORS
});

//adjuntar Authorization solo si no hay cookies (fallback para endpoints legacy)
http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  //verificar si hay cookies de autenticacion
  const hasCookie = authService.hasAccessToken();
  
  if (!hasCookie) {
    //fallback: enviar Authorization header si no hay cookies
    const token = getAccessToken();
    if (token) {
      if (!config.headers) config.headers = {} as any;
      (config.headers as any)['Authorization'] = `Bearer ${token}`;
    }
  }
  return config;
});

let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;
interface QueueItem {
  resolve: (token: string | null) => void;
  reject: (error: unknown) => void;
}
let failedQueue: QueueItem[] = [];

const processQueue = (error: unknown, token: string | null = null): void => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    const status = error.response?.status;
    const url = originalRequest?.url || '';

    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/refresh');

    if (status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing && refreshPromise) {
        //esperar a que el refresh actual termine
        return refreshPromise
          .then(() => {
            //reintentar la solicitud original
            return http(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      refreshPromise = (async () => {
        try {
          //con cookies httpOnly el refresh token va en la cookie; el backend lo lee de ahí
          const refresh = getRefreshToken();
          await http.post<RefreshTokenResponse>(
            '/auth/refresh',
            refresh ? { refresh_token: refresh } : {}
          );

          //esperar un momento para que las cookies se actualicen
          await new Promise(resolve => setTimeout(resolve, 200));
          
          const newToken = getAccessToken();
          processQueue(null, newToken);
        } catch (refreshError) {
          processQueue(refreshError, null);
          //limpiar storage y redirigir a login
          clearAuthStorage();
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        } finally {
          isRefreshing = false;
          refreshPromise = null;
        }
      })();

      return refreshPromise
        .then(() => {
          //reintentar la solicitud original sin Authorization header
          return http(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    //otros errores
    if (status) {
      logger.warn('HTTP error', { status, url });
    }
    return Promise.reject(error);
  }
);

export default http;