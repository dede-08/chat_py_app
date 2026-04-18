import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, User, Lock, Phone, UserPlus, Eye, EyeOff, MessageSquare } from 'lucide-react';
import authService from '../services/authService';
import logger from '../services/logger';
import PasswordStrengthMeter from '../components/PasswordStrengthMeter/PasswordStrengthMeter';
import SuccessModal from '../components/SuccessModal/SuccessModal';
import { isValidEmail, validateUsername, validateTelephone } from '../utils/validators';
import { sanitizeInput } from '../utils/sanitizer';

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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = () => {
      if (authService.isAuthenticated()) setAlreadyAuthenticated(true);
    };
    checkAuth();

    const loadRequirements = async () => {
      setRequirementsLoading(true);
      try {
        const result = await authService.getPasswordRequirements();
        setPasswordRequirements(result.data);
      } catch (error) {
        logger.error('Error al cargar requisitos de contraseña', error, {
          operation: 'getPasswordRequirements'
        });
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
    //sanitizar input segun el tipo
    const sanitizedValue = sanitizeInput(value, name === 'email' ? 'email' : name === 'username' ? 'username' : 'text');
    setFormData({ ...formData, [name]: sanitizedValue });

    if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: '' }));
    if (formErrors.general) setFormErrors(prev => ({ ...prev, general: '' }));
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.email) {
      errors.email = 'El email es requerido';
    } else if (!isValidEmail(formData.email)) {
      errors.email = 'El email no es válido. Por favor, ingrese un email válido.';
    }

    const usernameValidation = validateUsername(formData.username);
    if (!usernameValidation.isValid) errors.username = usernameValidation.error;

    if (!formData.password) {
      errors.password = 'La contraseña es requerida';
    } else if (!passwordValid) {
      errors.password = 'La contraseña no cumple con los requisitos de seguridad';
    }

    const telephoneValidation = validateTelephone(formData.telephone);
    if (!telephoneValidation.isValid) errors.telephone = telephoneValidation.error;

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePasswordValidation = useCallback((isValid) => {
    setPasswordValid(isValid);
  }, []);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!validateForm()) return;

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

  const isFormValid = () => {
    return formData.email && formData.username && formData.password && formData.telephone && passwordValid && !isLoading;
  };

  if (alreadyAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <div className="bg-shape bg-blue-500/20 top-10 left-10 w-96 h-96"></div>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel p-8 rounded-2xl w-full max-w-md text-center">
          <div className="mx-auto bg-blue-500/10 p-4 rounded-full w-20 h-20 flex items-center justify-center mb-4">
            <MessageSquare className="w-10 h-10 text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Ya estás conectado</h2>
          <p className="text-slate-400 mb-6">Parece que ya tienes una sesión activa.</p>
          <div className="space-y-3">
            <button onClick={() => navigate('/chat')} className="premium-btn">Ir al Chat</button>
            <button onClick={() => setAlreadyAuthenticated(false)} className="premium-btn-secondary">Continuar con Registro</button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden py-10 px-4">
      <div className="bg-shape bg-indigo-500/20 top-20 left-10 w-96 h-96"></div>
      <div className="bg-shape bg-blue-500/20 bottom-10 right-10 w-96 h-96"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-panel w-full max-w-md p-8 rounded-2xl relative z-10"
      >
        <div className="text-center mb-8">
          <div className="mx-auto bg-gradient-to-br from-indigo-500 to-purple-600 w-16 h-16 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/30">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
            Crear Cuenta
          </h1>
          <p className="text-slate-400 mt-2">Únete a nuestra plataforma de chat y descubre una nueva experiencia.</p>
        </div>

        {formErrors.general && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex gap-2">
            <span className="shrink-0 mt-0.5">⚠️</span>
            <p>{formErrors.general}</p>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-slate-500" />
              </div>
              <input
                type="email" name="email"
                className={`premium-input pl-11 ${formErrors.email ? 'border-red-500/50 focus:ring-red-500' : ''}`}
                placeholder="Correo electrónico"
                value={formData.email} onChange={handleChange} disabled={isSubmitting}
              />
            </div>
            {formErrors.email && <p className="text-red-400 text-xs mt-1.5 ml-1">{formErrors.email}</p>}
          </div>

          <div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-slate-500" />
              </div>
              <input
                type="text" name="username"
                className={`premium-input pl-11 ${formErrors.username ? 'border-red-500/50 focus:ring-red-500' : ''}`}
                placeholder="Nombre de usuario"
                value={formData.username} onChange={handleChange} disabled={isSubmitting}
              />
            </div>
            {formErrors.username && <p className="text-red-400 text-xs mt-1.5 ml-1">{formErrors.username}</p>}
          </div>

          <div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-500" />
              </div>
              <input
                type={showPassword ? "text" : "password"} name="password"
                className={`premium-input pl-11 pr-11 ${formErrors.password ? 'border-red-500/50 focus:ring-red-500' : ''}`}
                placeholder="Contraseña"
                value={formData.password} onChange={handleChange} disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {formErrors.password && <p className="text-red-400 text-xs mt-1.5 ml-1">{formErrors.password}</p>}

            <div className="mt-3">
              {!requirementsLoading && (
                <PasswordStrengthMeter password={formData.password} requirements={passwordRequirements} onValidationChange={handlePasswordValidation} />
              )}
            </div>
          </div>

          <div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Phone className="h-5 w-5 text-slate-500" />
              </div>
              <input
                type="text" name="telephone"
                className={`premium-input pl-11 ${formErrors.telephone ? 'border-red-500/50 focus:ring-red-500' : ''}`}
                placeholder="Teléfono (ej: +1234567890)"
                value={formData.telephone} onChange={handleChange} disabled={isSubmitting}
              />
            </div>
            {formErrors.telephone && <p className="text-red-400 text-xs mt-1.5 ml-1">{formErrors.telephone}</p>}
          </div>

          <button type="submit" disabled={!isFormValid() || isSubmitting} className="premium-btn mt-6">
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Registrar</span>
                <UserPlus className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-slate-400 text-sm mt-6">
          ¿Ya tienes una cuenta?{' '}
          <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
            Inicia sesión aquí
          </Link>
        </p>
      </motion.div>

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => { setShowSuccessModal(false); navigate('/login'); }}
        title="¡Registro Exitoso!"
        message={successMessage}
        onConfirm={() => { setShowSuccessModal(false); navigate('/login'); }}
        confirmButtonText="Ir a Iniciar Sesión"
      />
    </div>
  );
};

export default RegisterPage;
