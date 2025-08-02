import axios from 'axios';
import { redirect } from 'react-router-dom';

const API_URL = 'http://localhost:8000/auth';

export const registerUser = async (data) => {
  try {
    const response = await axios.post(`${API_URL}/register`, data);
    alert('Usuario registrado');
    return response.data;
  } catch (error) {
    console.error(error);
    alert('Error al registrar');
    redirect('/chat');
  }
};

export const loginUser = async (data) => {
  try {
    const response = await axios.post(`${API_URL}/login`, data);
    localStorage.setItem('token', response.data.token);
    redirect('/chat');
    return response.data;
  } catch (error) {
    console.error(error);
    alert('Error al iniciar sesión');
  }
};
