//servicio de logging centralizado

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4
};

//nivel de log según el entorno (desarrollo o producción)
const getLogLevel = () => {
  const env = import.meta.env.MODE || 'development';
  if (env === 'production') {
    return LOG_LEVELS.ERROR; //solo errores en producción
  }
  return LOG_LEVELS.DEBUG; //todo en desarrollo
};

const currentLogLevel = getLogLevel();

//formatea el mensaje de log con contexto
const formatMessage = (level, message, context = {}) => {
  const timestamp = new Date().toISOString();
  const contextStr = Object.keys(context).length > 0 
    ? ` | Context: ${JSON.stringify(context)}` 
    : '';
  
  return `[${timestamp}] [${level}] ${message}${contextStr}`;
};

//logger principal
const logger = {
  //log de debug (solo en desarrollo)
  debug: (message, context = {}) => {
    if (currentLogLevel <= LOG_LEVELS.DEBUG) {
      console.debug(formatMessage('DEBUG', message, context));
    }
  },

  //log de información
  info: (message, context = {}) => {
    if (currentLogLevel <= LOG_LEVELS.INFO) {
      console.info(formatMessage('INFO', message, context));
    }
  },

  //log de advertencia
  warn: (message, context = {}) => {
    if (currentLogLevel <= LOG_LEVELS.WARN) {
      console.warn(formatMessage('WARN', message, context));
    }
  },

  //log de error
  error: (message, error = null, context = {}) => {
    if (currentLogLevel <= LOG_LEVELS.ERROR) {
      const errorContext = {
        ...context,
        ...(error && {
          errorMessage: error.message,
          errorStack: error.stack,
          errorName: error.name
        })
      };
      console.error(formatMessage('ERROR', message, errorContext));
      
      //en producción, aquí se podría enviar a un servicio de monitoreo
      // como Sentry, LogRocket, etc.
      if (import.meta.env.MODE === 'production' && error) {
        //integrar con servicio de monitoreo
        //ejemplo: Sentry.captureException(error, { extra: errorContext });
      }
    }
  }
};

export default logger;

