//utilidad centralizada para manejo de errores

import logger from '../services/logger';

//tipos de errores comunes
export const ErrorTypes = {
  NETWORK: 'NETWORK',
  AUTHENTICATION: 'AUTHENTICATION',
  AUTHORIZATION: 'AUTHORIZATION',
  VALIDATION: 'VALIDATION',
  NOT_FOUND: 'NOT_FOUND',
  SERVER: 'SERVER',
  UNKNOWN: 'UNKNOWN'
};

//extrae el mensaje de error de una respuesta HTTP
const extractErrorMessage = (error) => {
  if (error.response?.data?.detail) {
    //fastapi devuelve errores en el campo 'detail'
    if (typeof error.response.data.detail === 'string') {
      return error.response.data.detail;
    }
    if (Array.isArray(error.response.data.detail)) {
      //errores de validación de fastapi
      return error.response.data.detail
        .map(err => err.msg || err.message || JSON.stringify(err))
        .join(', ');
    }
    return JSON.stringify(error.response.data.detail);
  }
  
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  
  if (error.message) {
    return error.message;
  }
  
  return 'Ha ocurrido un error desconocido';
};

//determina el tipo de error basado en el código de estado HTTP
const getErrorType = (statusCode) => {
  if (!statusCode) return ErrorTypes.UNKNOWN;
  
  if (statusCode === 401) return ErrorTypes.AUTHENTICATION;
  if (statusCode === 403) return ErrorTypes.AUTHORIZATION;
  if (statusCode === 404) return ErrorTypes.NOT_FOUND;
  if (statusCode === 422) return ErrorTypes.VALIDATION;
  if (statusCode >= 500) return ErrorTypes.SERVER;
  if (statusCode >= 400) return ErrorTypes.VALIDATION;
  
  return ErrorTypes.UNKNOWN;
};

//obtiene un mensaje de error amigable para el usuario
const getUserFriendlyMessage = (errorType, statusCode, defaultMessage) => {
  const messages = {
    [ErrorTypes.NETWORK]: 'No se pudo conectar con el servidor. Verifique su conexión a internet.',
    [ErrorTypes.AUTHENTICATION]: 'Su sesión ha expirado. Por favor, inicie sesión nuevamente.',
    [ErrorTypes.AUTHORIZATION]: 'No tiene permisos para realizar esta acción.',
    [ErrorTypes.NOT_FOUND]: 'El recurso solicitado no fue encontrado.',
    [ErrorTypes.VALIDATION]: defaultMessage || 'Los datos proporcionados no son válidos.',
    [ErrorTypes.SERVER]: 'Error en el servidor. Por favor, intente más tarde.',
    [ErrorTypes.UNKNOWN]: defaultMessage || 'Ha ocurrido un error inesperado.'
  };
  
  //mensajes específicos por código de estado
  if (statusCode === 401) {
    return 'Credenciales incorrectas. Verifique su usuario y contraseña.';
  }
  if (statusCode === 409) {
    return 'El nombre de usuario o correo ya está en uso.';
  }
  
  return messages[errorType] || defaultMessage || messages[ErrorTypes.UNKNOWN];
};

//procesa un error y devuelve un objeto estandarizado
export const handleError = (error, options = {}) => {
  const {
    context = {},
    logError = true,
    defaultMessage = null
  } = options;
  
  //determinar si es un error de red
  const isNetworkError = !error.response && error.request;
  
  const statusCode = error.response?.status;
  const errorType = isNetworkError ? ErrorTypes.NETWORK : getErrorType(statusCode);
  const rawMessage = extractErrorMessage(error);
  const userMessage = getUserFriendlyMessage(errorType, statusCode, defaultMessage || rawMessage);
  
  const errorInfo = {
    success: false,
    error: userMessage,
    errorType,
    statusCode,
    rawMessage,
    timestamp: new Date().toISOString()
  };
  
  //log del error
  if (logError) {
    logger.error(
      `Error procesado: ${userMessage}`,
      error,
      {
        ...context,
        errorType,
        statusCode,
        rawMessage
      }
    );
  }
  
  return errorInfo;
};

//procesa un error de axios y devuelve un objeto estandarizado
export const handleAxiosError = (error, context = {}) => {
  return handleError(error, { context, defaultMessage: null });
};

//procesa un error de fetch y devuelve un objeto estandarizado
export const handleFetchError = async (response, context = {}) => {
  let errorData = {};
  try {
    errorData = await response.json();
  } catch {
    //si no se puede parsear el JSON, usar el texto
    try {
      const text = await response.text();
      errorData = { detail: text };
    } catch {
      errorData = { detail: 'Error desconocido' };
    }
  }
  
  const error = {
    response: {
      status: response.status,
      data: errorData
    }
  };
  
  return handleError(error, { context });
};

//crea un objeto de respuesta de error estandarizado
export const createErrorResponse = (message, errorType = ErrorTypes.UNKNOWN, statusCode = null) => {
  return {
    success: false,
    error: message,
    errorType,
    statusCode,
    timestamp: new Date().toISOString()
  };
};

//crea un objeto de respuesta de éxito estandarizado
export const createSuccessResponse = (data = null) => {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString()
  };
};

//verifica si una respuesta es exitosa
export const isSuccessResponse = (response) => {
  return response && response.success === true;
};

//verifica si una respuesta es un error
export const isErrorResponse = (response) => {
  return response && response.success === false;
};

