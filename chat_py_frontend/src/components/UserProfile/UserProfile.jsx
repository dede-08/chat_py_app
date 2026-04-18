import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Mail, Phone, Lock, Edit2, X, Check, Eye, EyeOff, 
  ShieldCheck, AlertTriangle, CheckCircle2, Info, Loader2 
} from 'lucide-react';
import authService from '../../services/authService';
import logger from '../../services/logger';
import { isErrorResponse } from '../../utils/errorHandler';
import { isValidEmail, validateUsername } from '../../utils/validators';
import { sanitizeInput } from '../../utils/sanitizer';

const UserProfile = () => {
    const [isEditing, setIsEditing] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [userInfo, setUserInfo] = useState({
        username: '',
        email: '',
        telephone: '',
        password: '*********',
    });

    const [editInfo, setEditInfo] = useState({
        username: '',
        email: '',
        telephone: '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    useEffect(() => {
        const loadUserData = async () => {
            try {
                setLoading(true);
                setError(null);
                const result = await authService.getUserProfile();
                if (result.success && result.data) {
                    const { username, email, telephone } = result.data;
                    setUserInfo({
                        username: username || '',
                        email: email || '',
                        telephone: telephone || '',
                        password: '********'
                    });
                } else {
                    const username = authService.getUsername();
                    const email = authService.getUserEmail();
                    setUserInfo({
                        username: username || 'usuario',
                        email: email || 'email@example.com',
                        telephone: '',
                        password: '********'
                    });
                }
            } catch (err) {
                logger.error('Error al cargar datos del usuario', err, { operation: 'loadUserData' });
                setError('Error al cargar la información del perfil');
            } finally {
                setLoading(false);
            }
        };

        loadUserData();
    }, []);

    const handleEdit = () => {
        setEditInfo({
            username: userInfo.username,
            email: userInfo.email,
            telephone: userInfo.telephone || '',
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
        });
        setIsEditing(true);
        setShowSuccess(false);
        setError(null);
    };

    const handleCancel = () => {
        setIsEditing(false);
        setShowSuccess(false)
        setError(null);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        const sanitizedValue = sanitizeInput(value, name === 'email' ? 'email' : name === 'username' ? 'username' : 'text');
        setEditInfo(prev => ({
            ...prev,
            [name]: sanitizedValue
        }));
    };

    const handleSave = async () => {
        const errors = [];

        if (editInfo.email && !isValidEmail(editInfo.email)) {
            errors.push('El email no es válido');
        }

        if (editInfo.username) {
            const usernameValidation = validateUsername(editInfo.username);
            if (!usernameValidation.isValid) {
                errors.push(usernameValidation.error);
            }
        }

        if (editInfo.newPassword) {
            if (editInfo.newPassword !== editInfo.confirmPassword) {
                errors.push('Las contraseñas no coinciden');
            }
            if (editInfo.newPassword.length < 8) {
                errors.push('La contraseña debe tener al menos 8 caracteres');
            }
            if (!editInfo.currentPassword) {
                errors.push('Debe ingresar su contraseña actual para cambiarla');
            }
        }

        if (errors.length > 0) {
            setError(errors.join('. '));
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const updateData = {
                username: editInfo.username,
                email: editInfo.email,
                telephone: editInfo.telephone || undefined,
            };

            if (editInfo.newPassword) {
                updateData.currentPassword = editInfo.currentPassword;
                updateData.newPassword = editInfo.newPassword;
            }

            const result = await authService.updateUserProfile(updateData);

            if (isErrorResponse(result)) {
                setError(result.error);
            } else if (result.success && result.data) {
                const { username, email, telephone } = result.data;
                setUserInfo({
                    username: username || editInfo.username,
                    email: email || editInfo.email,
                    telephone: telephone || '',
                    password: '********'
                });

                setIsEditing(false);
                setShowSuccess(true);
                setShowPassword(false);
                setTimeout(() => setShowSuccess(false), 3000);
            }
        } catch (err) {
            logger.error('Error al actualizar perfil', err, { operation: 'updateUserProfile' });
            setError('Error al actualizar el perfil. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    if (loading && !userInfo.username) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-24 pb-12 px-4 flex justify-center relative overflow-hidden">
            {/* Background shapes */}
            <div className="bg-shape bg-blue-500/10 top-20 left-10 w-[500px] h-[500px]"></div>
            <div className="bg-shape bg-purple-500/10 bottom-10 right-10 w-[400px] h-[400px]"></div>

            <div className="w-full max-w-2xl relative z-10">
                <AnimatePresence>
                    {showSuccess && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mb-4 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 shrink-0" />
                                <span>¡Perfil actualizado exitosamente!</span>
                            </div>
                            <button onClick={() => setShowSuccess(false)} className="text-green-400 hover:text-green-300"><X className="w-4 h-4" /></button>
                        </motion.div>
                    )}

                    {error && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 shrink-0" />
                                <span>{error}</span>
                            </div>
                            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300"><X className="w-4 h-4" /></button>
                        </motion.div>
                    )}
                </AnimatePresence>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-panel rounded-2xl overflow-hidden"
                >
                    <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg">
                                <User className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-100">Mi Perfil</h1>
                                <p className="text-slate-400 text-sm">Información de la cuenta</p>
                            </div>
                        </div>
                        {!isEditing && (
                            <button onClick={handleEdit} className="premium-btn-secondary py-2 px-4 w-auto self-start sm:self-auto flex items-center gap-2">
                                <Edit2 className="w-4 h-4" /> Editar
                            </button>
                        )}
                    </div>

                    <div className="p-6">
                        {!isEditing ? (
                            <div className="space-y-6">
                                <div>
                                    <label className="text-xs text-slate-500 mb-1 block">Nombre de usuario</label>
                                    <div className="flex items-center gap-3 text-slate-200">
                                        <User className="w-5 h-5 text-blue-400" />
                                        <span className="font-medium text-lg">{userInfo.username}</span>
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="text-xs text-slate-500 mb-1 block">Correo electrónico</label>
                                    <div className="flex items-center gap-3 text-slate-200">
                                        <Mail className="w-5 h-5 text-blue-400" />
                                        <span className="font-medium text-lg">{userInfo.email}</span>
                                    </div>
                                </div>

                                {userInfo.telephone && (
                                    <div>
                                        <label className="text-xs text-slate-500 mb-1 block">Teléfono</label>
                                        <div className="flex items-center gap-3 text-slate-200">
                                            <Phone className="w-5 h-5 text-blue-400" />
                                            <span className="font-medium text-lg">{userInfo.telephone}</span>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="text-xs text-slate-500 mb-1 block">Contraseña</label>
                                    <div className="flex items-center gap-3 text-slate-200">
                                        <Lock className="w-5 h-5 text-blue-400" />
                                        <span className="font-medium text-lg tracking-widest">{userInfo.password}</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1 flex items-center gap-2">
                                        <User className="w-4 h-4" /> Nombre de usuario
                                    </label>
                                    <input type="text" name="username" className="premium-input" value={editInfo.username} onChange={handleChange} required />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1 flex items-center gap-2">
                                        <Mail className="w-4 h-4" /> Correo electrónico
                                    </label>
                                    <input type="email" name="email" className="premium-input" value={editInfo.email} onChange={handleChange} required />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1 flex items-center gap-2">
                                        <Phone className="w-4 h-4" /> Teléfono
                                    </label>
                                    <input type="tel" name="telephone" className="premium-input" placeholder="Ej: +34 600 000 000" value={editInfo.telephone} onChange={handleChange} />
                                </div>

                                <div className="pt-4 border-t border-white/10 mt-6">
                                    <h3 className="text-sm font-medium text-slate-200 mb-4 flex items-center gap-2">
                                        <Lock className="w-4 h-4 text-blue-400" /> Cambiar contraseña (Opcional)
                                    </h3>
                                    
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1">Contraseña actual</label>
                                            <div className="relative">
                                                <input type={showPassword ? "text" : "password"} name="currentPassword" placeholder="Ingresa tu contraseña actual" className="premium-input pr-10" value={editInfo.currentPassword} onChange={handleChange} />
                                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1">Nueva contraseña</label>
                                            <input type={showPassword ? "text" : "password"} name="newPassword" placeholder="Mínimo 8 caracteres" className="premium-input" value={editInfo.newPassword} onChange={handleChange} />
                                        </div>

                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1">Confirmar nueva contraseña</label>
                                            <input type={showPassword ? "text" : "password"} name="confirmPassword" placeholder="Repite la nueva contraseña" className="premium-input" value={editInfo.confirmPassword} onChange={handleChange} />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4">
                                    <button type="button" onClick={handleCancel} disabled={loading} className="premium-btn-secondary py-2 justify-center">
                                        <X className="w-4 h-4" /> Cancelar
                                    </button>
                                    <button type="button" onClick={handleSave} disabled={loading} className="premium-btn py-2 justify-center sm:w-auto">
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Check className="w-4 h-4" /> Guardar cambios</>}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {!isEditing && (
                        <div className="bg-slate-800/30 p-4 border-t border-white/5 flex items-center justify-center gap-2 text-xs text-slate-500">
                            <Info className="w-4 h-4" /> Última actualización: {new Date().toLocaleDateString('es-ES')}
                        </div>
                    )}
                </motion.div>

                <div className="text-center mt-6 text-slate-500 text-sm flex items-center justify-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    Tu información está protegida y segura
                </div>
            </div>
        </div>
    );
};

export default UserProfile;