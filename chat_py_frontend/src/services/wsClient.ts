import authService from './authService';

export const WS_BASE_URL: string = import.meta.env.VITE_WS_URL as string;

const getWsBaseUrl = (pathOrUrl: string): string => {
  const isAbsolute = /^wss?:\/\//i.test(pathOrUrl);
  return isAbsolute ? pathOrUrl : `${WS_BASE_URL}${pathOrUrl}`;
};

// Construye la URL del WebSocket. Con el proxy de Vite, la conexion es
// same-origin y las cookies httpOnly se envian automaticamente en cada request.
export const buildAuthorizedWsUrl = (pathOrUrl: string): string | null => {
  if (!authService.isAuthenticated()) return null;
  return getWsBaseUrl(pathOrUrl);
};
