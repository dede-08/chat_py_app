import React, { useState } from 'react';
import { registerUser } from '../services/authService';

const RegisterPage = () => {
  const [formData, setFormData] = useState({ email: '', username: '', password: '', telephone: '' });

  const handleChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    await registerUser(formData);
  };

  return (
    <div>
      <div className="fullscreen-container">
        <div className="form-container">
          <div className="container mt-5">
            <h3 className='text-white text-center'>Registro</h3>
            <form onSubmit={handleSubmit} className='form-container'>
              <div className="mb-3">
                <input className="form-control" name="email" placeholder='email' onChange={handleChange} />
              </div>
              <div className="mb-3">
                <input className="form-control" name="username" placeholder='username' onChange={handleChange} />
              </div>
              <div className="mb-3">
                <input className="form-control" type="password" name="password" placeholder='password' onChange={handleChange} />
              </div>
              <div className="mb-3">
                <input className="form-control" name="telephone" placeholder='telephone' onChange={handleChange} />
              </div>
              <button className="btn btn-primary btn-form">Registrar</button>
              <button type='reset' className='btn btn-danger btn-form'>Cancelar</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
