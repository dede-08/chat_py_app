import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL}/auth`;

const register = (userData) => {
    return axios.post(`${API_URL}/register`, userData);
};

export const loginUser = async (data) => {
  try {
    const response = await axios.post(`${API_URL}/login`, data);
    
    //verificar que la respuesta tenga los tokens
    if (!response.data.access_token || !response.data.refresh_token) {
      console.error('Respuesta de login sin tokens:', response.data);
      throw new Error('El servidor no devolvió los tokens necesarios');
    }
    
    //guardar access_token y refresh_token
    localStorage.setItem('access_token', response.data.access_token);
    localStorage.setItem('refresh_token', response.data.refresh_token);
    // Mantener compatibilidad con código antiguo que usa 'token'
    localStorage.setItem('token', response.data.access_token);
    localStorage.setItem('userEmail', response.data.email);
    //guardar el username del usuario logueado (con fallback al email si no hay username)
    const username = response.data.username || response.data.email || 'Usuario';
    localStorage.setItem('username', username);
    
    //verificar que se guardaron correctamente
    const savedToken = localStorage.getItem('access_token');
    if (!savedToken) {
      console.error('Error: El token no se guardó correctamente en localStorage');
    }
    
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error en login:', error);
    let errorMessage = 'Error al iniciar sesión. Por favor, inténtelo de nuevo más tarde.';

    if (error.response) {
        switch (error.response.status) {
            case 401:
                errorMessage = 'Credenciales incorrectas. Verifique su usuario y contraseña.';
                break;
            case 404:
                errorMessage = 'El usuario no existe. Por favor, regístrese.';
                break;
            default:
                errorMessage = error.response.data.detail || errorMessage;
        }
    } else if (error.request) {
        errorMessage = 'No se pudo conectar con el servidor. Verifique su conexión a internet.';
    }

    return { success: false, error: errorMessage };
  }
};

//obtener requisitos de contraseña
export const getPasswordRequirements = async () => {
  try {
    const response = await axios.get(`${API_URL}/password-requirements`);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error al obtener requisitos de contraseña:', error);
    throw error; //lanzar el error para que el componente lo maneje
  }
};

//validar contraseña
export const validatePassword = async (password) => {
  try {
    const response = await axios.post(`${API_URL}/validate-password`, { password });
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error al validar contraseña:', error);
    return { success: false, error: 'Error al validar contraseña' };
  }
};

//logout
export const logoutUser = async () => {
  try {
    const token = getToken();
    if (token) {
      await axios.post(`${API_URL}/logout`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    }
  } catch (error) {
    console.error('Error en logout:', error);
  } finally {
    //limpiar localStorage independientemente del resultado
    localStorage.removeItem('token');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('username');
  }
};

//obtener perfil completo del usuario
export const getUserProfile = async () => {
  try {
    const token = getToken();
    const response = await axios.get(`${API_URL}/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    let errorMessage = 'Error al cargar el perfil del usuario.';
    
    if (error.response) {
      switch (error.response.status) {
        case 401:
          errorMessage = 'Sesión expirada. Por favor, inicie sesión nuevamente.';
          //limpiar localStorage si el token expiró
          localStorage.removeItem('token');
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('userEmail');
          localStorage.removeItem('username');
          break;
        case 404:
          errorMessage = 'Perfil no encontrado.';
          break;
        default:
          errorMessage = error.response.data.detail || errorMessage;
      }
    } else if (error.request) {
      errorMessage = 'No se pudo conectar con el servidor.';
    }
    
    return { success: false, error: errorMessage };
  }
};

//actualizar perfil del usuario
export const updateUserProfile = async (data) => {
  try {
    const token = getToken();
    const response = await axios.put(`${API_URL}/profile`, data, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    //actualizar localStorage con los nuevos datos del usuario
    if (data.username) {
      localStorage.setItem('username', data.username);
    }
    if (data.email) {
      localStorage.setItem('userEmail', data.email);
    }
    
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    let errorMessage = 'Error al actualizar el perfil.';
    
    if (error.response) {
      switch (error.response.status) {
        case 401:
          errorMessage = 'Sesión expirada. Por favor, inicie sesión nuevamente.';
          //limpiar localStorage si el token expiró
          localStorage.removeItem('token');
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('userEmail');
          localStorage.removeItem('username');
          break;
        case 409:
          errorMessage = 'El nombre de usuario o correo ya está en uso.';
          break;
        case 422:
          errorMessage = 'Los datos proporcionados no son válidos.';
          break;
        default:
          errorMessage = error.response.data.detail || errorMessage;
      }
    } else if (error.request) {
      errorMessage = 'No se pudo conectar con el servidor.';
    }
    
    return { success: false, error: errorMessage };
  }
};

//obtener access token del localStorage
export const getToken = () => {
  // Priorizar access_token, pero mantener compatibilidad con 'token' antiguo
  return localStorage.getItem('access_token') || localStorage.getItem('token');
};

//obtener refresh token del localStorage
export const getRefreshToken = () => {
  return localStorage.getItem('refresh_token');
};

//renovar tokens usando refresh token
export const refreshTokens = async () => {
  try {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      throw new Error('No hay refresh token disponible');
    }

    const response = await axios.post(`${API_URL}/refresh`, {
      refresh_token: refreshToken
    });

    //guardar nuevos tokens
    localStorage.setItem('access_token', response.data.access_token);
    localStorage.setItem('refresh_token', response.data.refresh_token);
    //mantener compatibilidad
    localStorage.setItem('token', response.data.access_token);

    return {
      success: true,
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token
    };
  } catch (error) {
    console.error('Error al renovar tokens:', error);
    //si el refresh token es invalido, limpiar todo y forzar nuevo login
    logoutUser();
    throw error;
  }
};

//obtener email del usuario
export const getUserEmail = () => {
  return localStorage.getItem('userEmail');
};

//obtener username del usuario
export const getUsername = () => {
  return localStorage.getItem('username');
};

//verificar si el usuario está autenticado
export const isAuthenticated = () => {
  return !!getToken();
};

const confirmEmail = (token) => {
    return axios.get(`${API_URL}/confirm-email/${token}`);
};

//configurar interceptor de axios para renovar tokens automaticamente
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    //si el error es 401 y no es una peticion de refresh o login
    if (error.response?.status === 401 && 
        !originalRequest._retry && 
        !originalRequest.url?.includes('/refresh') &&
        !originalRequest.url?.includes('/login')) {
      
      if (isRefreshing) {
        //si ya se esta refrescando, esperar en la cola
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return axios(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newTokens = await refreshTokens();
        processQueue(null, newTokens.access_token);
        originalRequest.headers['Authorization'] = `Bearer ${newTokens.access_token}`;
        return axios(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        //redirigir a login si el refresh falla
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

//crear instancia por defecto para compatibilidad
export default {
    register,
    loginUser,
    logoutUser,
    isAuthenticated,
    validatePassword,
    getPasswordRequirements,
    confirmEmail,
    getToken,
    getRefreshToken,
    refreshTokens,
    getUserEmail,
    getUsername,
    getUserProfile,
    updateUserProfile
};
