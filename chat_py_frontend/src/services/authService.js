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
    alert('inicio de sesion exitoso')
    return response.data;
  } catch (error) {
    console.error(error);
    alert('Error al iniciar sesión');
  }
};
