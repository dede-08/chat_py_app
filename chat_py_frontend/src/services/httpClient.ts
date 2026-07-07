import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import logger from './logger';
import { authService } from './cookieService';

const API_BASE_URL = import.meta.env.VITE_API_URL as string;

const http = axios.create({ 
  baseURL: API_BASE_URL,
  withCredentials: true,
});

let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;
interface QueueItem {
  resolve: () => void;
  reject: (error: unknown) => void;
}
let failedQueue: QueueItem[] = [];

const processQueue = (error: unknown): void => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve();
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
        return refreshPromise
          .then(() => http(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      refreshPromise = (async () => {
        try {
          // El navegador envia la cookie httpOnly refresh_token automaticamente en cada request
          await http.post('/auth/refresh', {});
          processQueue(null);
        } catch (refreshError) {
          processQueue(refreshError);
          authService.clearAll();
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        } finally {
          isRefreshing = false;
          refreshPromise = null;
        }
      })();

      return refreshPromise
        .then(() => http(originalRequest))
        .catch((err) => Promise.reject(err));
    }

    if (status) {
      logger.warn('HTTP error', { status, url });
    }
    return Promise.reject(error);
  }
);

export default http;