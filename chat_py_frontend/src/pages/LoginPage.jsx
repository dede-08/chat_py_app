import React, { useState } from 'react';
import { registerUser } from '../services/authService';

const RegisterPage = () => {
  const [formData, setFormData] = useState({ username: '', password: '' });

  const handleChange = e => {
    setFormData({...formData, [e.target.name]: e.target.value});
  };

  const handleSubmit = async e => {
    e.preventDefault();
    await registerUser(formData);
  };

  return (
    <div className="container mt-5">
      <h2>Registro</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label>Usuario</label>
          <input className="form-control" name="username" onChange={handleChange} />
        </div>
        <div className="mb-3">
          <label>Contraseña</label>
          <input className="form-control" type="password" name="password" onChange={handleChange} />
        </div>
        <button className="btn btn-primary">Iniciar Sesion</button>
      </form>
    </div>
  );
};

export default RegisterPage;
