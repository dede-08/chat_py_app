//UTILIDAD CENTRALIZADA PARA EL MANEJO DE ERRORES

import logger from '../services/logger';
import type { ApiErrorResponse, ApiSuccessResponse, ApiResponse } from '../types';

//tipos de errores comunes
export const ErrorTypes = {
  NETWORK: 'NETWORK',
  AUTHENTICATION: 'AUTHENTICATION',
  AUTHORIZATION: 'AUTHORIZATION',
  VALIDATION: 'VALIDATION',
  NOT_FOUND: 'NOT_FOUND',
  SERVER: 'SERVER',
  UNKNOWN: 'UNKNOWN'
} as const;

export type ErrorType = typeof ErrorTypes[keyof typeof ErrorTypes];

//error de axios con tipado
import type { AxiosError as AxiosErrorType } from 'axios';

interface CustomAxiosError {
  response?: {
    status?: number;
    data?: {
      detail?: string | Array<{ msg?: string; message?: string }>;
      message?: string;
    };
  };
  request?: unknown;
  message?: string;
}

type AxiosError = AxiosErrorType | CustomAxiosError;

//extrae el mensaje de error de una respuesta HTTP
const extractErrorMessage = (error: AxiosError): string => {
  const responseData = error.response?.data;

  //verificar si es CustomAxiosError con estructura conocida
  if (responseData && typeof responseData === 'object' && 'detail' in responseData) {
    const detail = (responseData as { detail?: string | Array<{ msg?: string; message?: string }> }).detail;

    if (detail) {
      //fastapi devuelve errores en el campo 'detail'
      if (typeof detail === 'string') {
        return detail;
      }
      if (Array.isArray(detail)) {
        //errores de validación de FastAPI
        return detail
          .map((err: { msg?: string; message?: string }) => err.msg || err.message || JSON.stringify(err))
          .join(', ');
      }
      return JSON.stringify(detail);
    }
  }

  //verificar si tiene message
  if (responseData && typeof responseData === 'object' && 'message' in responseData) {
    const message = (responseData as { message?: string }).message;
    if (message) {
      return message;
    }
  }

  //verificar si es AxiosErrorType de axios
  if ('message' in error && error.message) {
    return error.message;
  }

  return 'Ha ocurrido un error desconocido';
};

//determina el tipo de error basado en el codigo de estado HTTP
const getErrorType = (statusCode: number | undefined): ErrorType => {
  if (!statusCode) return ErrorTypes.UNKNOWN;

  if (statusCode === 401) return ErrorTypes.AUTHENTICATION;
  if (statusCode === 403) return ErrorTypes.AUTHORIZATION;
  if (statusCode === 404) return ErrorTypes.NOT_FOUND;
  if (statusCode === 422) return ErrorTypes.VALIDATION;
  if (statusCode >= 500) return ErrorTypes.SERVER;
  if (statusCode >= 400) return ErrorTypes.VALIDATION;

  return ErrorTypes.UNKNOWN;
};

//obtine un mensaje de error amigable para el usuario
const getUserFriendlyMessage = (
  errorType: ErrorType,
  statusCode: number | undefined,
  defaultMessage: string | null
): string => {
  const messages: Record<ErrorType, string> = {
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

//opciones para manejo de errores
interface HandleErrorOptions {
  context?: Record<string, unknown>;
  logError?: boolean;
  defaultMessage?: string | null;
}

//Procesa un error y devuelve un objeto estandarizado
export const handleError = (error: AxiosError | Error, options: HandleErrorOptions = {}): ApiErrorResponse => {
  const {
    context = {},
    logError = true,
    defaultMessage = null
  } = options;

  //determinar si es un error de red
  const isNetworkError = !('response' in error) && 'request' in error;

  const statusCode = 'response' in error ? error.response?.status : undefined;
  const errorType = isNetworkError ? ErrorTypes.NETWORK : getErrorType(statusCode);
  const rawMessage = extractErrorMessage('response' in error ? error : { message: error.message });
  const userMessage = getUserFriendlyMessage(errorType, statusCode, defaultMessage || rawMessage);

  const errorInfo: ApiErrorResponse = {
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
      error instanceof Error ? error : null,
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
export const handleAxiosError = (error: AxiosError, context: Record<string, unknown> = {}): ApiErrorResponse => {
  return handleError(error, { context, defaultMessage: null });
};

//procesa un error de fetch y devuelve un objeto estandarizado
export const handleFetchError = async (
  response: Response,
  context: Record<string, unknown> = {}
): Promise<ApiErrorResponse> => {
  let errorData: { detail?: string | Array<{ msg?: string; message?: string }>; message?: string } = {};
  try {
    const jsonData = await response.json();
    //asegurar que tiene la estructura correcta
    if (jsonData && typeof jsonData === 'object') {
      if ('detail' in jsonData) {
        errorData.detail = jsonData.detail as string | Array<{ msg?: string; message?: string }>;
      }
      if ('message' in jsonData) {
        errorData.message = jsonData.message as string;
      }
    }
  } catch {
    //si no se puede parsear el JSON, usar el texto
    try {
      const text = await response.text();
      errorData = { detail: text };
    } catch {
      errorData = { detail: 'Error desconocido' };
    }
  }

  const error: CustomAxiosError = {
    response: {
      status: response.status,
      data: errorData
    }
  };

  return handleError(error, { context });
};

//crea un objeto de respuesta de error estandarizado
export const createErrorResponse = (
  message: string,
  errorType: ErrorType = ErrorTypes.UNKNOWN,
  statusCode: number | null = null
): ApiErrorResponse => {
  return {
    success: false,
    error: message,
    errorType,
    statusCode: statusCode || undefined,
    timestamp: new Date().toISOString()
  };
};

//crea un objeto de respuesta de éxito estandarizado
export const createSuccessResponse = <T = unknown>(data: T | null = null): ApiSuccessResponse<T> => {
  return {
    success: true,
    data: data as T,
    timestamp: new Date().toISOString()
  };
};

//verifica si una respuesta es exitosa
export const isSuccessResponse = <T = unknown>(response: ApiResponse<T>): response is ApiSuccessResponse<T> => {
  return response && response.success === true;
};

//verifica si una respuesta es un error
export const isErrorResponse = (response: ApiResponse): response is ApiErrorResponse => {
  return response && response.success === false;
};

