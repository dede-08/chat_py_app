import { useEffect, useState, useRef, useCallback, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Phone, Lock, Edit2, X, Check, Eye, EyeOff, ShieldCheck, AlertTriangle, CheckCircle2, Info, Loader2, Camera } from 'lucide-react';
import authService from '../../services/authService';
import { authService as cookieAuth } from '../../services/cookieService';
import logger from '../../services/logger';
import { isErrorResponse } from '../../utils/errorHandler';
import { isValidEmail, validateUsername, validateTelephone } from '../../utils/validators';
import { sanitizeInput } from '../../utils/sanitizer';
import Avatar from '../Avatar/Avatar';
import PasswordStrengthMeter from '../PasswordStrengthMeter/PasswordStrengthMeter';
import { uploadAvatar, deleteAvatar } from '../../services/uploadService';
import type { PasswordRequirements } from '../../types';

const PASSWORD_MASK = '********';

interface UserInfoState {
  username: string;
  email: string;
  telephone: string;
  avatar_url?: string | null;
}

interface EditInfoState {
  username: string;
  email: string;
  telephone: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const UserProfile = () => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [passwordRequirements, setPasswordRequirements] = useState<PasswordRequirements | null>(null);
  const [passwordValid, setPasswordValid] = useState(false);
  const [requirementsLoading, setRequirementsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewBlobRef = useRef<string | null>(null);

  const showSuccessMessage = () => {
    setShowSuccess(true);
    if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    successTimeoutRef.current = setTimeout(() => {
      setShowSuccess(false);
      successTimeoutRef.current = null;
    }, 3000);
  };

  const dismissSuccess = () => {
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = null;
    }
    setShowSuccess(false);
  };

  const setPreviewFromFile = (file: File) => {
    if (previewBlobRef.current) URL.revokeObjectURL(previewBlobRef.current);
    const url = URL.createObjectURL(file);
    previewBlobRef.current = url;
    setPreviewUrl(url);
  };

  const clearPreview = () => {
    if (previewBlobRef.current) {
      URL.revokeObjectURL(previewBlobRef.current);
      previewBlobRef.current = null;
    }
    setPreviewUrl(null);
  };

  const [userInfo, setUserInfo] = useState<UserInfoState>({
    username: '',
    email: '',
    telephone: '',
    avatar_url: null,
  });

  const [editInfo, setEditInfo] = useState<EditInfoState>({
    username: '',
    email: '',
    telephone: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    const loadUserData = async () => {
      try {
        setIsLoadingProfile(true);
        setError(null);
        const result = await authService.getUserProfile();
        if (result.success && result.data) {
          const { username, email, telephone, avatar_url, updated_at } = result.data;
          setUserInfo({
            username: username || '',
            email: email || '',
            telephone: telephone || '',
            avatar_url: avatar_url || null,
          });
          setLastUpdated(updated_at ?? null);
        } else {
          const username = authService.getUsername();
          const email = authService.getUserEmail();
          setUserInfo({
            username: username || 'usuario',
            email: email || 'email@example.com',
            telephone: '',
            avatar_url: null,
          });
        }
      } catch (err) {
        logger.error('Error al cargar datos del usuario', err instanceof Error ? err : null, { operation: 'loadUserData' });
        setError('Error al cargar la información del perfil');
      } finally {
        setIsLoadingProfile(false);
      }
    };

    loadUserData();
  }, []);

  useEffect(() => {
    const loadRequirements = async () => {
      setRequirementsLoading(true);
      try {
        const result = await authService.getPasswordRequirements();
        setPasswordRequirements(result.data);
      } catch (err) {
        logger.error('Error al cargar requisitos de contraseña', err instanceof Error ? err : null, { operation: 'getPasswordRequirements' });
        setPasswordRequirements({
          min_length: 8,
          max_length: 128,
          require_uppercase: true,
          require_lowercase: true,
          require_digits: true,
          require_special_chars: true,
          special_chars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
        });
      } finally {
        setRequirementsLoading(false);
      }
    };
    loadRequirements();
  }, []);

  const handlePasswordValidation = useCallback((isValid: boolean) => {
    setPasswordValid(isValid);
  }, []);

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
      if (previewBlobRef.current) URL.revokeObjectURL(previewBlobRef.current);
    };
  }, []);

  const handleEdit = () => {
    setEditInfo({
      username: userInfo.username,
      email: userInfo.email,
      telephone: userInfo.telephone || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setIsEditing(true);
    setShowSuccess(false);
    setError(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setShowSuccess(false);
    setError(null);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const sanitizedValue = sanitizeInput(value, name === 'email' ? 'email' : name === 'username' ? 'username' : 'text');
    setEditInfo((prev) => ({
      ...prev,
      [name]: sanitizedValue,
    }));
  };

  const handleSave = async () => {
    const errors: string[] = [];

    if (!editInfo.email.trim()) {
      errors.push('El email es requerido');
    } else if (!isValidEmail(editInfo.email)) {
      errors.push('El email no es válido');
    }

    const usernameValidation = validateUsername(editInfo.username);
    if (!usernameValidation.isValid && usernameValidation.error) errors.push(usernameValidation.error);

    if (editInfo.telephone.trim()) {
      const telephoneValidation = validateTelephone(editInfo.telephone);
      if (!telephoneValidation.isValid && telephoneValidation.error) errors.push(telephoneValidation.error);
    }
    if (editInfo.newPassword) {
      if (editInfo.newPassword !== editInfo.confirmPassword) errors.push('Las contraseñas no coinciden');
      if (!passwordValid) errors.push('La nueva contraseña no cumple los requisitos de seguridad');
      if (!editInfo.currentPassword) errors.push('Debe ingresar su contraseña actual para cambiarla');
    }
    if (errors.length > 0) {
      setError(errors.join('. '));
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      const updateData: {
        username: string;
        email: string;
        telephone?: string;
        currentPassword?: string;
        newPassword?: string;
      } = {
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
        if (result.data.email_confirmation_required) {
          navigate('/login', {
            replace: true,
            state: { message: 'Revisa tu nuevo correo para confirmar el cambio de email antes de iniciar sesión.' },
          });
          return;
        }
        const { username, email, telephone, avatar_url, updated_at } = result.data;
        setUserInfo((prev) => ({
          ...prev,
          username: username || editInfo.username,
          email: email || editInfo.email,
          telephone: telephone || '',
          avatar_url: avatar_url ?? prev.avatar_url,
        }));
        if (updated_at) setLastUpdated(updated_at);
        setIsEditing(false);
        showSuccessMessage();
        setShowPassword(false);
      }
    } catch (err) {
      logger.error('Error al actualizar perfil', err instanceof Error ? err : null, { operation: 'updateUserProfile' });
      setError('Error al actualizar el perfil. Intenta de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Solo se permiten archivos JPEG, PNG o WebP');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no puede superar los 5MB');
      return;
    }

    setPreviewFromFile(file);
    setIsUploadingAvatar(true);
    setError(null);

    try {
      const result = await uploadAvatar(file);
      if (isErrorResponse(result)) {
        setError(result.error);
        clearPreview();
      } else {
        setUserInfo((prev) => ({ ...prev, avatar_url: result.data.avatar_url }));
        cookieAuth.saveUserData(authService.getUserEmail() || '', authService.getUsername() || '', result.data.avatar_url);
        clearPreview();
        showSuccessMessage();
      }
    } catch {
      setError('Error al subir la imagen');
      clearPreview();
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteAvatar = async () => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar tu foto de perfil?')) return;

    setIsUploadingAvatar(true);
    setError(null);

    try {
      const result = await deleteAvatar();
      if (isErrorResponse(result)) {
        setError(result.error);
      } else {
        setUserInfo((prev) => ({ ...prev, avatar_url: null }));
        cookieAuth.saveUserData(authService.getUserEmail() || '', authService.getUsername() || '', null);
        showSuccessMessage();
      }
    } catch {
      setError('Error al eliminar la imagen');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  if (isLoadingProfile && !userInfo.username) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 flex justify-center relative overflow-hidden">
      <div className="bg-shape bg-blue-500/10 top-20 left-10 w-[500px] h-[500px]" />
      <div className="bg-shape bg-purple-500/10 bottom-10 right-10 w-[400px] h-[400px]" />

      <div className="w-full max-w-2xl relative z-10">
        <AnimatePresence>
          {showSuccess && (
            <motion.div role="alert" aria-live="polite" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mb-4 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>Perfil actualizado exitosamente!</span>
              </div>
              <button type="button" onClick={dismissSuccess} aria-label="Cerrar mensaje de éxito" className="text-green-400 hover:text-green-300">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {error && (
            <motion.div role="alert" aria-live="assertive" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
              <button type="button" onClick={() => setError(null)} aria-label="Cerrar mensaje de error" className="text-red-400 hover:text-red-300">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <Avatar src={previewUrl || userInfo.avatar_url} username={userInfo.username} size="md" className="w-14 h-14 text-2xl" />
                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    aria-label="Cambiar foto de perfil"
                    className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    {isUploadingAvatar ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Camera className="w-5 h-5 text-white" />}
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-100">Mi Perfil</h1>
                <p className="text-slate-400 text-sm">Información de la cuenta</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isEditing && userInfo.avatar_url && (
                <button
                  onClick={handleDeleteAvatar}
                  disabled={isUploadingAvatar}
                  aria-label="Eliminar foto de perfil"
                  className="premium-btn-secondary py-2 px-3 w-auto self-start sm:self-auto flex items-center gap-2 text-red-400 hover:text-red-300"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              {!isEditing && (
                <button onClick={handleEdit} className="premium-btn-secondary py-2 px-4 w-auto self-start sm:self-auto flex items-center gap-2">
                  <Edit2 className="w-4 h-4" /> Editar
                </button>
              )}
            </div>
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
                    <span className="font-medium text-lg tracking-widest">{PASSWORD_MASK}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <label htmlFor="profile-username" className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-1">
                    <User className="w-4 h-4" /> Nombre de usuario
                  </label>
                  <input id="profile-username" type="text" name="username" className="premium-input" value={editInfo.username} onChange={handleChange} required />
                </div>

                <div>
                  <label htmlFor="profile-email" className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-1">
                    <Mail className="w-4 h-4" /> Correo electrónico
                  </label>
                  <input id="profile-email" type="email" name="email" className="premium-input" value={editInfo.email} onChange={handleChange} required />
                </div>

                <div>
                  <label htmlFor="profile-telephone" className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-1">
                    <Phone className="w-4 h-4" /> Teléfono
                  </label>
                  <input id="profile-telephone" type="tel" name="telephone" className="premium-input" placeholder="Ej: +34 600 000 000" value={editInfo.telephone} onChange={handleChange} />
                </div>

                <div className="pt-4 border-t border-white/10 mt-6">
                  <h3 className="text-sm font-medium text-slate-200 mb-4 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-blue-400" /> Cambiar contraseña (Opcional)
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label htmlFor="profile-current-password" className="block text-xs text-slate-400 mb-1">Contraseña actual</label>
                      <div className="relative">
                        <input id="profile-current-password" type={showPassword ? 'text' : 'password'} name="currentPassword" placeholder="Ingresa tu contraseña actual" className="premium-input pr-10" value={editInfo.currentPassword} onChange={handleChange} />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ocultar contraseñas' : 'Mostrar contraseñas'} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="profile-new-password" className="block text-xs text-slate-400 mb-1">Nueva contraseña</label>
                      <input id="profile-new-password" type={showPassword ? 'text' : 'password'} name="newPassword" placeholder="Mínimo 8 caracteres" className="premium-input" value={editInfo.newPassword} onChange={handleChange} />
                      {editInfo.newPassword && !requirementsLoading && (
                        <div className="mt-2">
                          <PasswordStrengthMeter
                            password={editInfo.newPassword}
                            requirements={passwordRequirements}
                            onValidationChange={handlePasswordValidation}
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label htmlFor="profile-confirm-password" className="block text-xs text-slate-400 mb-1">Confirmar nueva contraseña</label>
                      <input id="profile-confirm-password" type={showPassword ? 'text' : 'password'} name="confirmPassword" placeholder="Repite la nueva contraseña" className="premium-input" value={editInfo.confirmPassword} onChange={handleChange} />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4">
                  <button type="button" onClick={handleCancel} disabled={isSaving} className="premium-btn-secondary py-2 justify-center">
                    <X className="w-4 h-4" /> Cancelar
                  </button>
                  <button type="button" onClick={handleSave} disabled={isSaving} className="premium-btn py-2 justify-center sm:w-auto">
                    {isSaving ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4" /> Guardar cambios
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {!isEditing && (
            <div className="bg-slate-800/30 p-4 border-t border-white/5 flex items-center justify-center gap-2 text-xs text-slate-500">
              <Info className="w-4 h-4" /> Última actualización:{' '}
              {lastUpdated ? new Date(lastUpdated).toLocaleDateString('es-ES') : 'No disponible'}
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
