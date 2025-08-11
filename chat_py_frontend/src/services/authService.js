import axios from 'axios';

const API_URL = 'http://localhost:8000/auth';

export const registerUser = async (data) => {
  try {
    const response = await axios.post(`${API_URL}/register`, data);
    alert('Usuario registrado');
    return response.data;
  } catch (error) {
    console.error(error);
    alert('Error al registrar');
  }
};

export const loginUser = async (data) => {
  try {
    const response = await axios.post(`${API_URL}/login`, data);
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('userEmail', response.data.email);
    alert('inicio de sesion exitoso')
    return response.data;
  } catch (error) {
    console.error(error);
    alert('Error al iniciar sesión');
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

// Verificar si el usuario está autenticado
export const isAuthenticated = () => {
  return !!getToken();
};

// Cerrar sesión
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('userEmail');
};

// Crear instancia por defecto para compatibilidad
const authService = {
  registerUser,
  loginUser,
  getToken,
  getUserEmail,
  isAuthenticated,
  logout
};

export default authService;
