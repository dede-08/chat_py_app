import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser, isAuthenticated } from '../services/authService';
import { isErrorResponse } from '../utils/errorHandler';
import logger from '../services/logger';

const LoginPage = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [alreadyAuthenticated, setAlreadyAuthenticated] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [generalError, setGeneralError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    //verificar si el usuario ya esta autenticado
    if (isAuthenticated()) {
      setAlreadyAuthenticated(true);
    }
  }, []);

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    //limpiar errores del campo cuando el usuario empiece a escribir
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const errors = {};

    //validar email
    if (!formData.email) {
      errors.email = 'El email es requerido';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'El email no es válido';
    }

    //validar contraseña
    if (!formData.password) {
      errors.password = 'La contraseña es requerida';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setGeneralError(null);
    
    try {
      const result = await loginUser(formData);
      if (isErrorResponse(result)) {
        setGeneralError(result.error);
      } else if (result.success) {
        //disparar evento para actualizar el navbar
        window.dispatchEvent(new Event('storage'));
        //redirigir al chat después del login exitoso
        navigate('/chat');
      }
    } catch (error) {
      logger.error('Error inesperado en login', error, { operation: 'handleSubmit' });
      setGeneralError('Ha ocurrido un error inesperado. Por favor, intente nuevamente.');
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
                Continuar con Login
              </button>
            </div>
          </div>
        )}
        
        <h3 className='text-light text-center mb-4'>Iniciar Sesión</h3>
        
        {generalError && (
          <div className="alert alert-danger mb-3" role="alert">
            <i className="fas fa-exclamation-triangle me-2"></i>
            {generalError}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
          <label htmlFor="email" className="form-label text-light">Email</label>
            <input 
              className={`form-control ${formErrors.email ? 'is-invalid' : ''}`}
              name="email" 
              placeholder='email' 
              value={formData.email}
              onChange={handleChange} 
            />
            {formErrors.email && (
              <div className="invalid-feedback">{formErrors.email}</div>
            )}
          </div>
          
          <div className="mb-3">
            <label htmlFor="password" className="form-label text-light">Contraseña</label>
            <input 
              className={`form-control ${formErrors.password ? 'is-invalid' : ''}`}
              type="password" 
              name="password" 
              placeholder='password' 
              value={formData.password}
              onChange={handleChange} 
            />
            {formErrors.password && (
              <div className="invalid-feedback">{formErrors.password}</div>
            )}
          </div>
          
          <div className="d-flex justify-content-center gap-3">
            <button 
              className="btn btn-primary" 
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? 'Iniciando...' : 'Iniciar Sesión'}
            </button>
            <button 
              type='reset' 
              className="btn btn-danger" 
              disabled={isLoading}
              onClick={() => {
                setFormData({ email: '', password: '' });
                setFormErrors({});
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
