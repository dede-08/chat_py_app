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
    <div className="fullscreen-container">
      <div className="form-container">
        <h3 className='text-dark text-center mb-4'>Registro</h3>
        <form onSubmit={handleSubmit}>
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
          <div className="d-flex justify-content-center gap-3">
            <button className="btn btn-primary">Registrar</button>
            <button type='reset' className='btn btn-danger'>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;
