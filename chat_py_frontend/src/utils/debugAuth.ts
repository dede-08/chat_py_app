//utilidad para desarrollo - limpiar rate limits
export const clearRateLimits = async (): Promise<void> => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/dev/clear-ratelimits`);
    const data = await response.json();
    console.log('Rate limits limpiados:', data.message);
  } catch (error) {
    console.error('Error limpiando rate limits:', error);
  }
};

//funcion para limpiar cookies del cliente
export const clearClientCookies = (): void => {
  document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  document.cookie = 'refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('token');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('username');
  console.log('Cookies y localStorage limpiados');
};

//funcion de diagnóstico completo
export const debugAuth = async (): Promise<void> => {
  console.log('=== Diagnóstico de Autenticación ===');
  console.log('Cookies:', document.cookie);
  console.log('localStorage:', {
    access_token: localStorage.getItem('access_token'),
    refresh_token: localStorage.getItem('refresh_token'),
    token: localStorage.getItem('token'),
    userEmail: localStorage.getItem('userEmail'),
    username: localStorage.getItem('username')
  });
  
  //limpiar rate limits
  await clearRateLimits();
  
  //limpiar cookies cliente
  clearClientCookies();
  
  console.log('=== Limpieza completada ===');
};