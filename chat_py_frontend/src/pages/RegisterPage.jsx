import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import authService from '../services/authService';
import PasswordStrengthMeter from '../components/PasswordStrengthMeter';
import SuccessModal from '../components/SuccessModal';

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
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [requirementsLoading, setRequirementsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    //verificar si el usuario ya esta autenticado
    const checkAuth = () => {
      if (authService.isAuthenticated()) {
        setAlreadyAuthenticated(true);
      }
    };
    
    checkAuth();

    //cargar requisitos de contraseña
    const loadRequirements = async () => {
      setRequirementsLoading(true);
      try {
        const result = await authService.getPasswordRequirements();
        setPasswordRequirements(result.data);
      } catch (error) {
        console.error('Error al cargar requisitos de contraseña:', error);
        //fallback a requisitos por defecto
        setPasswordRequirements({
          min_length: 8,
          max_length: 128,
          require_uppercase: true,
          require_lowercase: true,
          require_digits: true,
          require_special_chars: true,
          special_chars: '!@#$%^&*()_+-=[]{}|;:,.<>?'
        });
      } finally {
        setRequirementsLoading(false);
      }
    };

    loadRequirements();
  }, []);

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    //limpiar errores del campo cuando el usuario empiece a escribir
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
    
    //limpiar error general cuando el usuario empiece a escribir
    if (formErrors.general) {
      setFormErrors(prev => ({ ...prev, general: '' }));
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

    //validar username
    if (!formData.username) {
      errors.username = 'El nombre de usuario es requerido';
    } else if (formData.username.length < 3) {
      errors.username = 'El nombre de usuario debe tener al menos 3 caracteres';
    } else if (formData.username.length > 50) {
      errors.username = 'El nombre de usuario no puede tener más de 50 caracteres';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      errors.username = 'El nombre de usuario solo puede contener letras, números y guiones bajos';
    }

    //validar contraseña
    if (!formData.password) {
      errors.password = 'La contraseña es requerida';
    } else if (!passwordValid) {
      errors.password = 'La contraseña no cumple con los requisitos de seguridad';
    }

    //validar telefono
    if (!formData.telephone) {
      errors.telephone = 'El teléfono es requerido';
    } else if (!/^\+?[\d\s\-()]{7,15}$/.test(formData.telephone)) {
      errors.telephone = 'Formato de teléfono inválido (ej: +1234567890)';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePasswordValidation = useCallback((isValid) => {
    setPasswordValid(isValid);
  }, []);

  const handleSubmit = async e => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setIsSubmitting(true);
    
    try {
      const response = await authService.register(formData);
      setSuccessMessage(response.data.message);
      setShowSuccessModal(true);
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Error de conexión. Inténtalo de nuevo.';
      setFormErrors(prev => ({ ...prev, general: errorMessage }));
    } finally {
      setIsLoading(false);
      setIsSubmitting(false);
    }
  };

  const handleGoToChat = () => {
    navigate('/chat');
  };

  const resetForm = () => {
    setFormData({ email: '', username: '', password: '', telephone: '' });
    setFormErrors({});
    setPasswordValid(false);
    setAlreadyAuthenticated(false);
    setShowPassword(false);
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    navigate('/login');
  };

  const isFormValid = () => {
    return formData.email && 
           formData.username && 
           formData.password && 
           formData.telephone && 
           passwordValid && 
           !isLoading;
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
        
        <h3 className='text-light text-center mb-4'>Registro</h3>
        
        {/* mostrar error general */}
        {formErrors.general && (
          <div className="alert alert-danger mb-3" role="alert">
            <i className="fas fa-exclamation-triangle me-2"></i>
            {formErrors.general}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="email" className="form-label text-light">Email</label>
            <input 
              id="email"
              className={`form-control ${formErrors.email ? 'is-invalid' : ''}`}
              name="email" 
              type="email"
              placeholder='ejemplo@correo.com' 
              value={formData.email}
              onChange={handleChange}
              disabled={isSubmitting}
            />
            {formErrors.email && (
              <div className="invalid-feedback">{formErrors.email}</div>
            )}
          </div>
          
          <div className="mb-3">
            <label htmlFor="username" className="form-label text-light">Nombre de usuario</label>
            <input 
              id="username"
              className={`form-control ${formErrors.username ? 'is-invalid' : ''}`}
              name="username" 
              placeholder='usuario123' 
              value={formData.username}
              onChange={handleChange}
              disabled={isSubmitting}
            />
            {formErrors.username && (
              <div className="invalid-feedback">{formErrors.username}</div>
            )}
          </div>
          
          <div className="mb-3">
            <label htmlFor="password" className="form-label text-light">Contraseña</label>
            <div className="input-group">
              <input 
                id="password"
                className={`form-control ${formErrors.password ? 'is-invalid' : ''}`}
                type={showPassword ? "text" : "password"}
                name="password" 
                placeholder='Tu contraseña' 
                value={formData.password}
                onChange={handleChange}
                disabled={isSubmitting}
              />
              <button 
                className="btn btn-outline-secondary" 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isSubmitting}
              >
                <i className={`fas fa-${showPassword ? 'eye-slash' : 'eye'}`}></i>
              </button>
            </div>
            {formErrors.password && (
              <div className="invalid-feedback">{formErrors.password}</div>
            )}
            
            {/* medidor de fortaleza de contraseña */}
            {!requirementsLoading && (
              <PasswordStrengthMeter 
                password={formData.password}
                requirements={passwordRequirements}
                onValidationChange={handlePasswordValidation}
              />
            )}
          </div>
          
          <div className="mb-3">
            <label htmlFor="telephone" className="form-label text-light">Teléfono</label>
            <input 
              id="telephone"
              className={`form-control ${formErrors.telephone ? 'is-invalid' : ''}`}
              name="telephone" 
              placeholder='+1234567890' 
              value={formData.telephone}
              onChange={handleChange}
              disabled={isSubmitting}
            />
            {formErrors.telephone && (
              <div className="invalid-feedback">{formErrors.telephone}</div>
            )}
          </div>
          
          <div className="d-flex justify-content-center gap-3 mb-3">
            <button 
              className="btn btn-primary" 
              disabled={!isFormValid() || isSubmitting}
              type="submit"
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Registrando...
                </>
              ) : (
                'Registrar'
              )}
            </button>
            <button 
              type='button' 
              className='btn btn-outline-secondary' 
              disabled={isSubmitting}
              onClick={resetForm}
            >
              Limpiar
            </button>
          </div>
          
          <div className="text-center">
            <p className="mb-0 text-light">
              ¿Ya tienes una cuenta? 
              <Link to="/login" className="text-decoration-none ms-1">
                Inicia sesión aquí
              </Link>
            </p>
          </div>
        </form>
      </div>
      
      {/* modal de exito */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={handleSuccessModalClose}
        title="¡Registro Exitoso!"
        message={successMessage}
        onConfirm={handleSuccessModalClose}
        confirmButtonText="Ir a Iniciar Sesión"
      />
    </div>
  );
};

export default RegisterPage;
