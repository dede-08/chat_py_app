//utilidades de sanitización para prevenir XSS y otros ataques

export const sanitizeString = (input: string): string => {
  if (!input || typeof input !== 'string') return '';
  
  //remover caracteres de control (excepto espacios, tabs, newlines)
  //eslint-disable-next-line no-control-regex
  let sanitized = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');
  
  //remover scripts y eventos inline
  sanitized = sanitized
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/on\w+\s*=\s*[^\s>]*/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:text\/html/gi, '');
  
  //escapar caracteres HTML especiales pero mantener el texto legible
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
  
  return sanitized.trim();
};

 
//Sanitiza un mensaje de chat
export const sanitizeChatMessage = (message: string): string => {
  if (!message || typeof message !== 'string') return '';
  
  //primero sanitizar normalmente
  let sanitized = sanitizeString(message);
  
  //convertir saltos de línea a <br> para mostrar correctamente
  // (esto se hace en el componente al renderizar, no aquí)
  //por ahora solo preservamos los saltos de línea como \n
  
  return sanitized;
};

//sanitiza un email (solo remueve caracteres peligrosos, no valida formato)
export const sanitizeEmail = (email: string): string => {
  if (!email || typeof email !== 'string') return '';
  
  //remover caracteres de control y espacios
  //eslint-disable-next-line no-control-regex
  return email.replace(/[\x00-\x1F\x7F-\x9F\s]/g, '').trim().toLowerCase();
};

//sanitiza un nombre de usuario (solo remueve caracteres peligrosos, no valida formato)
export const sanitizeUsername = (username: string): string => {
  if (!username || typeof username !== 'string') return '';
  
  //remover caracteres de control y espacios al inicio/final
  // eslint-disable-next-line no-control-regex
  let sanitized = username.replace(/[\x00-\x1F\x7F-\x9F]/g, '').trim();
  
  //remover caracteres especiales peligrosos pero mantener guiones y guiones bajos
  sanitized = sanitized.replace(/[^a-zA-Z0-9_-]/g, '');
  
  return sanitized;
};

//escapa HTML para prevenir XSS al renderizar
export const escapeHtml = (text: string): string => {
  if (!text || typeof text !== 'string') return '';
  
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

//sanitiza y valida un input antes de enviarlo
export const sanitizeInput = (input: string, type: 'email' | 'username' | 'message' | 'text' = 'text'): string => {
  if (!input || typeof input !== 'string') return '';
  
  switch (type) {
    case 'email':
      return sanitizeEmail(input);
    case 'username':
      return sanitizeUsername(input);
    case 'message':
      return sanitizeChatMessage(input);
    default:
      return sanitizeString(input);
  }
};

