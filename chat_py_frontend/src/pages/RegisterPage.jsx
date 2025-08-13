import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerUser, isAuthenticated, getPasswordRequirements } from '../services/authService';
import PasswordStrengthMeter from '../components/PasswordStrengthMeter';

const RegisterPage = () => {
  const [formData, setFormData] = useState({ 
    email: '', 
    username: '', 
    password: '', 
    telephone: '' 
  });
  const [isLoading, setIsLoading] = useState(false);
  const [alreadyAuthenticated, setAlreadyAuthenticated] = useState(false);
  const [passwordRequirements, setPasswordRequirements] = useState(null);
  const [passwordValid, setPasswordValid] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState([]);
  const [formErrors, setFormErrors] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    // Verificar si el usuario ya está autenticado
    if (isAuthenticated()) {
      setAlreadyAuthenticated(true);
    }

    // Cargar requisitos de contraseña
    loadPasswordRequirements();
  }, []);

  const loadPasswordRequirements = async () => {
    try {
      const result = await getPasswordRequirements();
      if (result.success) {
        setPasswordRequirements(result.data);
      }
    } catch (error) {
      console.error('Error al cargar requisitos de contraseña:', error);
    }
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Limpiar errores del campo cuando el usuario empiece a escribir
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const errors = {};

    // Validar email
    if (!formData.email) {
      errors.email = 'El email es requerido';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'El email no es válido';
    }

    // Validar username
    if (!formData.username) {
      errors.username = 'El nombre de usuario es requerido';
    } else if (formData.username.length < 3) {
      errors.username = 'El nombre de usuario debe tener al menos 3 caracteres';
    } else if (formData.username.length > 50) {
      errors.username = 'El nombre de usuario no puede tener más de 50 caracteres';
    }

    // Validar contraseña
    if (!formData.password) {
      errors.password = 'La contraseña es requerida';
    } else if (!passwordValid) {
      errors.password = 'La contraseña no cumple con los requisitos de seguridad';
    }

    // Validar teléfono
    if (!formData.telephone) {
      errors.telephone = 'El teléfono es requerido';
    } else if (!/^\+?[\d\s\-\(\)]{7,15}$/.test(formData.telephone)) {
      errors.telephone = 'Formato de teléfono inválido';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePasswordValidation = (isValid, errors) => {
    setPasswordValid(isValid);
    setPasswordErrors(errors);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

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
            <input 
              className={`form-control ${formErrors.email ? 'is-invalid' : ''}`}
              name="email" 
              placeholder='Email' 
              value={formData.email}
              onChange={handleChange} 
            />
            {formErrors.email && (
              <div className="invalid-feedback">{formErrors.email}</div>
            )}
          </div>
          
          <div className="mb-3">
            <input 
              className={`form-control ${formErrors.username ? 'is-invalid' : ''}`}
              name="username" 
              placeholder='Nombre de usuario' 
              value={formData.username}
              onChange={handleChange} 
            />
            {formErrors.username && (
              <div className="invalid-feedback">{formErrors.username}</div>
            )}
          </div>
          
          <div className="mb-3">
            <input 
              className={`form-control ${formErrors.password ? 'is-invalid' : ''}`}
              type="password" 
              name="password" 
              placeholder='Contraseña' 
              value={formData.password}
              onChange={handleChange} 
            />
            {formErrors.password && (
              <div className="invalid-feedback">{formErrors.password}</div>
            )}
            
            {/* Medidor de fortaleza de contraseña */}
            <PasswordStrengthMeter 
              password={formData.password}
              requirements={passwordRequirements}
              onValidationChange={handlePasswordValidation}
            />
          </div>
          
          <div className="mb-3">
            <input 
              className={`form-control ${formErrors.telephone ? 'is-invalid' : ''}`}
              name="telephone" 
              placeholder='Teléfono (ej: +1234567890)' 
              value={formData.telephone}
              onChange={handleChange} 
            />
            {formErrors.telephone && (
              <div className="invalid-feedback">{formErrors.telephone}</div>
            )}
          </div>
          
          <div className="d-flex justify-content-center gap-3">
            <button 
              className="btn btn-primary" 
              disabled={isLoading || !passwordValid}
              type="submit"
            >
              {isLoading ? 'Registrando...' : 'Registrar'}
            </button>
            <button 
              type='reset' 
              className='btn btn-danger' 
              disabled={isLoading}
              onClick={() => {
                setFormData({ email: '', username: '', password: '', telephone: '' });
                setFormErrors({});
                setPasswordValid(false);
                setPasswordErrors([]);
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

export default RegisterPage;
