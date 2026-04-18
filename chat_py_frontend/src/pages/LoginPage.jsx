import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn, MessageSquare } from 'lucide-react';
import { loginUser, isAuthenticated } from '../services/authService';
import { isErrorResponse } from '../utils/errorHandler';
import logger from '../services/logger';
import { isValidEmail } from '../utils/validators';
import { sanitizeEmail } from '../utils/sanitizer';

const LoginPage = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [alreadyAuthenticated, setAlreadyAuthenticated] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [generalError, setGeneralError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated()) {
      setAlreadyAuthenticated(true);
    }
  }, []);

  const handleChange = e => {
    const { name, value } = e.target;
    //sanitizar input según el tipo
    const sanitizedValue = name === 'email' ? sanitizeEmail(value) : value;
    setFormData({ ...formData, [name]: sanitizedValue });

    if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.email) {
      errors.email = 'El email es requerido';
    } else if (!isValidEmail(formData.email)) {
      errors.email = 'El email no es válido.';
    }
    if (!formData.password) {
      errors.password = 'La contraseña es requerida';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setGeneralError(null);

    try {
      const result = await loginUser(formData);
      if (isErrorResponse(result)) {
        setGeneralError(result.error);
      } else if (result.success) {
        window.dispatchEvent(new Event('storage'));
        navigate('/chat');
      }
    } catch (error) {
      logger.error('Error inesperado en login', error, { operation: 'handleSubmit' });
      setGeneralError('Ha ocurrido un error inesperado.');
    } finally {
      setIsLoading(false);
    }
  };

  if (alreadyAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <div className="bg-shape bg-blue-500/20 top-10 left-10 w-96 h-96"></div>
        <div className="bg-shape bg-purple-500/20 bottom-10 right-10 w-96 h-96"></div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="glass-panel p-8 rounded-2xl w-full max-w-md text-center"
        >
          <div className="mx-auto bg-blue-500/10 p-4 rounded-full w-20 h-20 flex items-center justify-center mb-4 border border-blue-500/20">
            <MessageSquare className="w-10 h-10 text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Ya estás conectado</h2>
          <p className="text-slate-400 mb-6">Parece que ya tienes una sesión activa en este dispositivo.</p>
          <div className="space-y-3">
            <button onClick={() => navigate('/chat')} className="premium-btn">
              Ir a mis chats
            </button>
            <button onClick={() => setAlreadyAuthenticated(false)} className="premium-btn-secondary">
              Iniciar otra cuenta
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden py-10 px-4">
      {/* Background blobs */}
      <div className="bg-shape bg-blue-500/20 top-20 left-1/4 w-96 h-96"></div>
      <div className="bg-shape bg-indigo-500/20 bottom-20 right-1/4 w-96 h-96"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-panel w-full max-w-md p-8 rounded-2xl relative z-10"
      >
        <div className="text-center mb-8">
          <div className="mx-auto bg-gradient-to-br from-blue-500 to-indigo-600 w-16 h-16 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
            Bienvenido
          </h1>
          <p className="text-slate-400 mt-2">Inicia sesión para continuar chateando.</p>
        </div>

        {generalError && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex gap-2">
            <span className="shrink-0 mt-0.5">⚠️</span>
            <p>{generalError}</p>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-slate-500" />
              </div>
              <input
                type="email"
                name="email"
                className={`premium-input pl-11 ${formErrors.email ? 'border-red-500/50 focus:ring-red-500' : ''}`}
                placeholder="Correo electrónico"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            {formErrors.email && <p className="text-red-400 text-xs mt-1.5 ml-1">{formErrors.email}</p>}
          </div>

          <div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-500" />
              </div>
              <input
                type="password"
                name="password"
                className={`premium-input pl-11 ${formErrors.password ? 'border-red-500/50 focus:ring-red-500' : ''}`}
                placeholder="Contraseña"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
            {formErrors.password && <p className="text-red-400 text-xs mt-1.5 ml-1">{formErrors.password}</p>}
          </div>

          <button type="submit" disabled={isLoading} className="premium-btn mt-6">
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Iniciar Sesión</span>
                <LogIn className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-slate-400 text-sm mt-6">
          ¿No tienes una cuenta?{' '}
          <button onClick={() => navigate('/register')} className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
            Regístrate aquí
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default LoginPage;
