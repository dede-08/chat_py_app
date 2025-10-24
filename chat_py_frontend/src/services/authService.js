import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL}/auth`;

export const registerUser = async (data) => {
  try {
    const response = await axios.post(`${API_URL}/register`, data);
    //guardar el username después del registro exitoso
    localStorage.setItem('username', data.username);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error en registro:', error);
    let errorMessage = 'Error al registrar usuario';
    
    if (error.response?.data?.detail) {
      errorMessage = error.response.data.detail;
    } else if (error.response?.status === 409) {
      errorMessage = 'El usuario ya existe';
    } else if (error.response?.status === 422) {
      errorMessage = 'Datos de entrada inválidos';
    } else if (error.code === 'NETWORK_ERROR') {
      errorMessage = 'Error de conexión. Verifica tu internet.';
    }
    
    return { success: false, error: errorMessage };
  }
};

export const loginUser = async (data) => {
  try {
    const response = await axios.post(`${API_URL}/login`, data);
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('userEmail', response.data.email);
    //guardar el username del usuario logueado (con fallback al email si no hay username)
    const username = response.data.username || response.data.email || 'Usuario';
    localStorage.setItem('username', username);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error en login:', error);
    let errorMessage = 'Error al iniciar sesión';
    
    if (error.response?.data?.detail) {
      errorMessage = error.response.data.detail;
    } else if (error.response?.status === 401) {
      errorMessage = 'Credenciales incorrectas';
    } else if (error.response?.status === 404) {
      errorMessage = 'Usuario no encontrado';
    } else if (error.code === 'NETWORK_ERROR') {
      errorMessage = 'Error de conexión. Verifica tu internet.';
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
    //retornar requisitos por defecto si falla
    return { 
      success: true, 
      data: {
        min_length: 8,
        max_length: 128,
        require_uppercase: true,
        require_lowercase: true,
        require_digits: true,
        require_special_chars: true,
        special_chars: '!@#$%^&*()_+-=[]{}|;:,.<>?'
      }
    };
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
    localStorage.removeItem('userEmail');
    localStorage.removeItem('username');
  }
};

//obtener token del localStorage
export const getToken = () => {
  return localStorage.getItem('token');
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

//cerrar sesión (versión simple sin llamada al backend)
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('username');
};

//crear instancia por defecto para compatibilidad
const authService = {
  registerUser,
  loginUser,
  getPasswordRequirements,
  validatePassword,
  logoutUser,
  getToken,
  getUserEmail,
  getUsername,
  isAuthenticated,
  logout
};

export default authService;
