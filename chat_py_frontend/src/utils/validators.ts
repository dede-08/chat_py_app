/**
 * Utilidades de validación centralizadas
 * Proporciona funciones de validación consistentes en todo el frontend
*/

//resultado de validacion
export interface ValidationResult {
  isValid: boolean;
  error: string | null;
}


//valida un email usando regex mas robusta
export const isValidEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') return false;
  
  //regex mas robusta para validar email, basada en RFC 5322 pero simplificada para la mayoría de casos comunes
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  //validaciones adicionales para evitar casos problematicos
  if (email.length > 254) return false; //RFC 5321 limite
  if (email.startsWith('.') || email.startsWith('@')) return false;
  if (email.includes('..')) return false; //no permite puntos consecutivos
  
  return emailRegex.test(email.trim());
};


//valida un nombre de usuario 
export const validateUsername = (username: string): ValidationResult => {
  if (!username || typeof username !== 'string') {
    return { isValid: false, error: 'El nombre de usuario es requerido' };
  }
  
  const trimmed = username.trim();
  
  if (trimmed.length < 3) {
    return { isValid: false, error: 'El nombre de usuario debe tener al menos 3 caracteres' };
  }
  
  if (trimmed.length > 50) {
    return { isValid: false, error: 'El nombre de usuario no puede tener más de 50 caracteres' };
  }
  
  //solo letras, numeros, guiones y guiones bajos
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return { isValid: false, error: 'El nombre de usuario solo puede contener letras, números, guiones y guiones bajos' };
  }
  
  //no puede empezar o terminar con (- o _)
  if (/^[-_]|[-_]$/.test(trimmed)) {
    return { isValid: false, error: 'El nombre de usuario no puede empezar o terminar con guión o guión bajo' };
  }
  
  return { isValid: true, error: null };
};

//valida un numero de telefono
export const validateTelephone = (telephone: string): ValidationResult => {
  if (!telephone || typeof telephone !== 'string') {
    return { isValid: false, error: 'El teléfono es requerido' };
  }
  
  const trimmed = telephone.trim();
  
  //regex para validar formato de telefono internacional
  const phoneRegex = /^\+?[\d\s\-()]{7,15}$/;
  
  if (!phoneRegex.test(trimmed)) {
    return { isValid: false, error: 'Formato de teléfono inválido (ej: +1234567890)' };
  }
  
  //contar solo digitos
  const digitsOnly = trimmed.replace(/\D/g, '');
  if (digitsOnly.length < 7 || digitsOnly.length > 15) {
    return { isValid: false, error: 'El teléfono debe tener entre 7 y 15 dígitos' };
  }
  
  return { isValid: true, error: null };
};


//valida el contenido de un mensaje de chat, asegurando que no este vacio y no exceda un limite de caracteres
export const validateChatMessage = (message: string, maxLength: number = 5000): ValidationResult => {
  if (!message || typeof message !== 'string') {
    return { isValid: false, error: 'El mensaje no puede estar vacío' };
  }
  
  const trimmed = message.trim();
  
  if (trimmed.length === 0) {
    return { isValid: false, error: 'El mensaje no puede estar vacío' };
  }
  
  if (trimmed.length > maxLength) {
    return { 
      isValid: false, 
      error: `El mensaje no puede exceder ${maxLength} caracteres` 
    };
  }
  
  return { isValid: true, error: null };
};

//valida que el campo no este vacio
export const validateRequired = (value: string, fieldName: string = 'Campo'): ValidationResult => {
  if (!value || (typeof value === 'string' && value.trim().length === 0)) {
    return { isValid: false, error: `${fieldName} es requerido` };
  }
  return { isValid: true, error: null };
};

//valida la longitud de un string
export const validateLength = (
  value: string, 
  min: number | null, 
  max: number | null, 
  fieldName: string = 'Campo'
): ValidationResult => {
  if (!value || typeof value !== 'string') {
    return { isValid: false, error: `${fieldName} es requerido` };
  }
  
  const length = value.trim().length;
  
  if (min !== null && length < min) {
    return { isValid: false, error: `${fieldName} debe tener al menos ${min} caracteres` };
  }
  
  if (max !== null && length > max) {
    return { isValid: false, error: `${fieldName} no puede tener más de ${max} caracteres` };
  }
  
  return { isValid: true, error: null };
};

