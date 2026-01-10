import authService from './authService';

export const WS_BASE_URL: string = import.meta.env.VITE_WS_URL as string;

//indica si hay token disponible
export const hasWsToken = (): boolean => {
  return !!authService.getToken();
};

//construye una URL WS completa con token; devuelve null si no hay token
export const buildAuthorizedWsUrl = (pathOrUrl: string): string | null => {
  const token = authService.getToken();
  if (!token) return null;

  const isAbsolute = /^wss?:\/\//i.test(pathOrUrl);
  const base = isAbsolute ? pathOrUrl : `${WS_BASE_URL}${pathOrUrl}`;
  const hasQuery = base.includes('?');
  const sep = hasQuery ? '&' : '?';
  return `${base}${sep}token=${token}`;
};