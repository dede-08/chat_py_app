/**
 * Servicio de logging centralizado
 * Reemplaza console.log/error/warn con un sistema estructurado
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4
} as const;

type LogLevel = typeof LOG_LEVELS[keyof typeof LOG_LEVELS];

// Nivel de log según el entorno (desarrollo o producción)
const getLogLevel = (): LogLevel => {
  const env = import.meta.env.MODE || 'development';
  if (env === 'production') {
    return LOG_LEVELS.ERROR; // Solo errores en producción
  }
  return LOG_LEVELS.DEBUG; // Todo en desarrollo
};

const currentLogLevel = getLogLevel();

/**
 * Formatea el mensaje de log con contexto
 */
const formatMessage = (level: string, message: string, context: Record<string, unknown> = {}): string => {
  const timestamp = new Date().toISOString();
  const contextStr = Object.keys(context).length > 0 
    ? ` | Context: ${JSON.stringify(context)}` 
    : '';
  
  return `[${timestamp}] [${level}] ${message}${contextStr}`;
};

/**
 * Logger principal
 */
interface LoggerContext {
  [key: string]: unknown;
}

const logger = {
  /**
   * Log de debug (solo en desarrollo)
   */
  debug: (message: string, context: LoggerContext = {}): void => {
    if (currentLogLevel <= LOG_LEVELS.DEBUG) {
      console.debug(formatMessage('DEBUG', message, context));
    }
  },

  /**
   * Log de información
   */
  info: (message: string, context: LoggerContext = {}): void => {
    if (currentLogLevel <= LOG_LEVELS.INFO) {
      console.info(formatMessage('INFO', message, context));
    }
  },

  /**
   * Log de advertencia
   */
  warn: (message: string, context: LoggerContext = {}): void => {
    if (currentLogLevel <= LOG_LEVELS.WARN) {
      console.warn(formatMessage('WARN', message, context));
    }
  },

  /**
   * Log de error
   */
  error: (message: string, error: Error | null = null, context: LoggerContext = {}): void => {
    if (currentLogLevel <= LOG_LEVELS.ERROR) {
      const errorContext: LoggerContext = {
        ...context,
        ...(error && {
          errorMessage: error.message,
          errorStack: error.stack,
          errorName: error.name
        })
      };
      console.error(formatMessage('ERROR', message, errorContext));
      
      // En producción, aquí se podría enviar a un servicio de monitoreo
      // como Sentry, LogRocket, etc.
      if (import.meta.env.MODE === 'production' && error) {
        // TODO: Integrar con servicio de monitoreo
        // Example: Sentry.captureException(error, { extra: errorContext });
      }
    }
  }
};

export default logger;

