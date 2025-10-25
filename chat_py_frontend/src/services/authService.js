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
    let errorMessage = 'Error al registrar usuario. Por favor, inténtelo de nuevo más tarde.';
    
    if (error.response) {
        switch (error.response.status) {
            case 409:
                errorMessage = 'El nombre de usuario o correo electrónico ya está en uso.';
                break;
            case 422:
                errorMessage = 'Los datos proporcionados no son válidos. Por favor, revise los campos.';
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
    throw error; // Lanzar el error para que el componente lo maneje
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
