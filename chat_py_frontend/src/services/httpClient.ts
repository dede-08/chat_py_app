import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import logger from './logger';

const API_BASE_URL = import.meta.env.VITE_API_URL as string;

//utilidades internas para tokens
const getAccessToken = (): string | null => {
  return localStorage.getItem('access_token') || localStorage.getItem('token');
};

const getRefreshToken = (): string | null => {
  return localStorage.getItem('refresh_token');
};

const saveTokens = (access: string, refresh: string): void => {
  localStorage.setItem('access_token', access);
  localStorage.setItem('refresh_token', refresh);
  // compatibilidad con codigo antiguo que usa 'token'
  localStorage.setItem('token', access);
};

const clearAuthStorage = (): void => {
  localStorage.removeItem('token');
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('username');
};

const http = axios.create({ baseURL: API_BASE_URL });

//adjuntar Authorization en cada request si hay token
http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) {
    if (!config.headers) config.headers = {} as any;
    (config.headers as any)['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
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
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers && token) {
              (originalRequest.headers as any)['Authorization'] = `Bearer ${token}`;
            }
            return http(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refresh = getRefreshToken();
        if (!refresh) {
          throw new Error('No refresh token available');
        }

        const resp = await http.post<{ access_token: string; refresh_token: string }>(
          '/auth/refresh',
          { refresh_token: refresh }
        );

        const newAccess = resp.data.access_token;
        const newRefresh = resp.data.refresh_token;
        saveTokens(newAccess, newRefresh);
        processQueue(null, newAccess);

        if (originalRequest.headers) {
          (originalRequest.headers as any)['Authorization'] = `Bearer ${newAccess}`;
        }
        return http(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        //limpiar storage y redirigir a login
        clearAuthStorage();
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    //otros errores
    if (status) {
      logger.warn('HTTP error', { status, url });
    }
    return Promise.reject(error);
  }
);

export default http;