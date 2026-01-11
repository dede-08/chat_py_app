import authService from './authService';
import http from './httpClient';

export const WS_BASE_URL: string = import.meta.env.VITE_WS_URL as string;

// Indica si hay token disponible
export const hasWsToken = (): boolean => {
  return !!authService.getToken();
};

// Construye una URL WS completa con token; devuelve null si no hay token
export const buildAuthorizedWsUrl = (pathOrUrl: string): string | null => {
  const token = authService.getToken();
  if (!token) return null;

  const isAbsolute = /^wss?:\/\//i.test(pathOrUrl);
  const base = isAbsolute ? pathOrUrl : `${WS_BASE_URL}${pathOrUrl}`;
  const hasQuery = base.includes('?');
  const sep = hasQuery ? '&' : '?';
  return `${base}${sep}token=${token}`;
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

const saveTokens = (access: string, refresh: string): void => {
  localStorage.setItem('access_token', access);
  localStorage.setItem('refresh_token', refresh);
  localStorage.setItem('token', access); // compat
};

const clearAuthStorage = (): void => {
  localStorage.removeItem('token');
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('username');
};

// Asegura que exista un access token válido; si no, intenta refrescar
export const ensureValidAccessToken = async (skewSeconds = 30): Promise<string | null> => {
  const current = authService.getToken();
  if (current && isAccessTokenFresh(current, skewSeconds)) {
    return current;
  }
  const refresh = authService.getRefreshToken();
  if (!refresh) return null;
  try {
    const resp = await http.post<{ access_token: string; refresh_token: string }>(
      '/auth/refresh',
      { refresh_token: refresh }
    );
    saveTokens(resp.data.access_token, resp.data.refresh_token);
    return resp.data.access_token;
  } catch (e) {
    clearAuthStorage();
    return null;
  }
};
