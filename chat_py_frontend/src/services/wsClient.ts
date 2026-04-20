import authService from './authService';
import http from './httpClient';

export const WS_BASE_URL: string = import.meta.env.VITE_WS_URL as string;


export const hasWsToken = (): boolean => {
  return !!authService.getToken() || authService.isAuthenticated();
};


const getWsBaseUrl = (pathOrUrl: string): string => {
  const isAbsolute = /^wss?:\/\//i.test(pathOrUrl);
  return isAbsolute ? pathOrUrl : `${WS_BASE_URL}${pathOrUrl}`;
};


//construye la URL del WebSocket con token
export const buildAuthorizedWsUrl = (pathOrUrl: string): string | null => {
  const token = authService.getToken();
  const base = getWsBaseUrl(pathOrUrl);
  if (token) {
    const hasQuery = base.includes('?');
    const sep = hasQuery ? '&' : '?';
    return `${base}${sep}token=${token}`;
  }
  if (authService.isAuthenticated()) {
    return base;
  }
  return null;
};

// --- Helpers JWT ---
const decodeJwtPayload = (token: string): any | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1] ?? '';
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
};

const isAccessTokenFresh = (token: string, skewSeconds = 30): boolean => {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return false;
  const now = Math.floor(Date.now() / 1000);
  return payload.exp - now > skewSeconds;
};

const clearAuthStorage = (): void => {
  localStorage.removeItem('token');
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('username');
};

//asegura que el token de acceso es valido
export const ensureValidAccessToken = async (skewSeconds = 30): Promise<string | null> => {
  const current = authService.getToken();
  if (current && isAccessTokenFresh(current, skewSeconds)) {
    return current;
  }

  if (!current && authService.isAuthenticated()) {
    return '__cookie__';
  }
  try {
    const refresh = authService.getRefreshToken();
    await http.post<{ access_token?: string; refresh_token?: string }>(
      '/auth/refresh',
      refresh ? { refresh_token: refresh } : {}
    );
  } catch {
    if (authService.getToken()) clearAuthStorage();
    return null;
  }
  const after = authService.getToken();
  if (after) return after;
  if (authService.isAuthenticated()) return '__cookie__';
  return null;
};
