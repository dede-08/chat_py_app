import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerUser, isAuthenticated } from '../services/authService';

const RegisterPage = () => {
  const [formData, setFormData] = useState({ email: '', username: '', password: '', telephone: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [alreadyAuthenticated, setAlreadyAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Verificar si el usuario ya está autenticado
    if (isAuthenticated()) {
      setAlreadyAuthenticated(true);
    }
  }, []);

  const handleChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const result = await registerUser(formData);
      if (result.success) {
        // Disparar evento para actualizar el navbar
        window.dispatchEvent(new Event('storage'));
        // Redirigir al chat después del registro exitoso
        navigate('/chat');
      }
    } catch (error) {
      console.error('Error en el registro:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToChat = () => {
    navigate('/chat');
  };

  return (
    <div className="fullscreen-container">
      <div className="form-container">
        {alreadyAuthenticated && (
          <div className="alert alert-info mb-4" role="alert">
            <h5>Ya estás autenticado</h5>
            <p>Parece que ya tienes una sesión activa. ¿Qué quieres hacer?</p>
            <div className="d-flex gap-2">
              <button 
                className="btn btn-primary" 
                onClick={handleGoToChat}
              >
                Ir al Chat
              </button>
              <button 
                className="btn btn-outline-secondary" 
                onClick={() => setAlreadyAuthenticated(false)}
              >
                Continuar con Registro
              </button>
            </div>
          </div>
        )}
        
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
            <button className="btn btn-primary" disabled={isLoading}>
              {isLoading ? 'Registrando...' : 'Registrar'}
            </button>
            <button type='reset' className='btn btn-danger' disabled={isLoading}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;
