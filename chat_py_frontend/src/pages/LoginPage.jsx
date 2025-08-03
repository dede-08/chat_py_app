import React, { useState } from 'react';
import { loginUser } from '../services/authService';

const LoginPage = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });

  const handleChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    await loginUser(formData);
  };

  return (
    <div className="fullscreen-container">
      <div className="form-container">
        <div className="container mt-5">
          <h3 className='text-white text-center'>Login</h3>
          <form onSubmit={handleSubmit} className='form-container'>
            <div className="mb-3">
              <input className="form-control" name="email" placeholder='email' onChange={handleChange} />
            </div>
            <div className="mb-3">
              <input className="form-control" type="password" name="password" placeholder='password' onChange={handleChange} />
            </div>
            <button className="btn btn-primary btn-form">Iniciar Sesion</button>
            <button type='reset' className="btn btn-danger btn-form">Cancelar</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
