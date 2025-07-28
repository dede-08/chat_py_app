import axios from 'axios';

const API_URL = 'http://localhost:8000/auth'; // Ajusta el puerto y ruta si es necesario

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
    alert('Inicio de sesión exitoso');
    return response.data;
  } catch (error) {
    console.error(error);
    alert('Error al iniciar sesión');
  }
};
