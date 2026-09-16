import { useState, useEffect, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn } from 'lucide-react';
import { loginUser } from '../services/authService';
import { isErrorResponse } from '../utils/errorHandler';
import logger from '../services/logger';
import { isValidEmail } from '../utils/validators';
import { sanitizeEmail } from '../utils/sanitizer';

interface LoginFormData {
  email: string;
  password: string;
}

const LoginPage = () => {
  const [formData, setFormData] = useState<LoginFormData>({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const state = location.state as { message?: string } | null;
    if (state?.message) {
      setInfoMessage(state.message);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const sanitizedValue = name === 'email' ? sanitizeEmail(value) : value;
    setFormData((prev) => ({ ...prev, [name]: sanitizedValue }));
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.email) errors.email = 'El email es requerido';
    else if (!isValidEmail(formData.email)) errors.email = 'El email no es válido.';
    if (!formData.password) errors.password = 'La contraseña es requerida';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setGeneralError(null);
    try {
      const result = await loginUser(formData);
      if (isErrorResponse(result)) setGeneralError(result.error);
      else if (result.success) {
        window.dispatchEvent(new Event('storage'));
        navigate('/chat');
      }
    } catch (error) {
      logger.error('Error inesperado en login', error instanceof Error ? error : null, { operation: 'handleSubmit' });
      setGeneralError('Ha ocurrido un error inesperado.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden py-10 px-4">
      <div className="bg-shape bg-blue-500/20 top-20 left-1/4 w-96 h-96" />
      <div className="bg-shape bg-indigo-500/20 bottom-20 right-1/4 w-96 h-96" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="glass-panel w-full max-w-md p-8 rounded-2xl relative z-10">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 rounded-xl flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-6xl">chat_bubble</span>
          </div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">Bienvenido</h1>
          <p className="text-slate-400 mt-2">Inicia sesión para continuar chateando.</p>
        </div>

        {generalError && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex gap-2">
            <span className="material-symbols-outlined shrink-0 mt-0.5">warning</span>
            <p>{generalError}</p>
          </motion.div>
        )}

        {infoMessage && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400 text-sm flex gap-2">
            <span className="material-symbols-outlined shrink-0 mt-0.5">info</span>
            <p>{infoMessage}</p>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-slate-500" />
              </div>
              <input type="email" name="email" className={`premium-input pl-11 ${formErrors.email ? 'border-red-500/50 focus:ring-red-500' : ''}`} placeholder="Correo electrónico" value={formData.email} onChange={handleChange} />
            </div>
            {formErrors.email && <p className="text-red-400 text-xs mt-1.5 ml-1">{formErrors.email}</p>}
          </div>

          <div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-500" />
              </div>
              <input type="password" name="password" className={`premium-input pl-11 ${formErrors.password ? 'border-red-500/50 focus:ring-red-500' : ''}`} placeholder="Contraseña" value={formData.password} onChange={handleChange} />
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
            Registrate aquí
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default LoginPage;
