import axios from 'axios';

const API_URL = 'http://localhost:8000/auth';

export const registerUser = async (data) => {
  try {
    const response = await axios.post(`${API_URL}/register`, data);
    // Guardar el username después del registro exitoso
    localStorage.setItem('username', data.username);
    alert('Usuario registrado exitosamente');
    return { success: true, data: response.data };
  } catch (error) {
    console.error(error);
    const errorMessage = error.response?.data?.detail || 'Error al registrar usuario';
    alert(errorMessage);
    return { success: false, error: errorMessage };
  }
};

export const loginUser = async (data) => {
  try {
    const response = await axios.post(`${API_URL}/login`, data);
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('userEmail', response.data.email);
    // Guardar el username del usuario logueado (con fallback al email si no hay username)
    const username = response.data.username || response.data.email || 'Usuario';
    localStorage.setItem('username', username);
    alert('Inicio de sesión exitoso');
    return { success: true, data: response.data };
  } catch (error) {
    console.error(error);
    const errorMessage = error.response?.data?.detail || 'Error al iniciar sesión';
    alert(errorMessage);
    return { success: false, error: errorMessage };
  }
};

// Obtener token del localStorage
export const getToken = () => {
  return localStorage.getItem('token');
};

// Obtener email del usuario
export const getUserEmail = () => {
  return localStorage.getItem('userEmail');
};

// Obtener username del usuario
export const getUsername = () => {
  return localStorage.getItem('username');
};

// Verificar si el usuario está autenticado
export const isAuthenticated = () => {
  return !!getToken();
};

// Cerrar sesión
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('username');
};

// Crear instancia por defecto para compatibilidad
const authService = {
  registerUser,
  loginUser,
  getToken,
  getUserEmail,
  getUsername,
  isAuthenticated,
  logout
};

export default authService;
