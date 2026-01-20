import React, { useEffect, useState } from 'react';
import './UserProfile.css';
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
        password: '*********',
    });

    const [editInfo, setEditInfo] = useState({
        username: '',
        email: '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });


    useEffect(() => {
        const loadUserData = async () => {
            try {

                setLoading(true);

                const username = authService.getUsername();
                const email = authService.getUserEmail();

                setUserInfo({
                    username: username || 'usuario',
                    email: email || 'email@example.com',
                    password: '********'
                });

            } catch (err) {
                logger.error('Error al cargar datos del usuario', err, { 
                    operation: 'loadUserData' 
                });
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
        //sanitizar input según el tipo
        const sanitizedValue = sanitizeInput(value, name === 'email' ? 'email' : name === 'username' ? 'username' : 'text');
        setEditInfo(prev => ({
            ...prev,
            [name]: sanitizedValue
        }));
    };

    const handleSave = async () => {
        //validaciones mejoradas
        const errors = [];

        //validar email
        if (editInfo.email && !isValidEmail(editInfo.email)) {
            errors.push('El email no es válido');
        }

        //validar username
        if (editInfo.username) {
            const usernameValidation = validateUsername(editInfo.username);
            if (!usernameValidation.isValid) {
                errors.push(usernameValidation.error);
            }
        }

        //validar contraseñas
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
            };

            //solo incluir password si se esta cambiando
            if (editInfo.newPassword){
                updateData.currentPassword = editInfo.currentPassword;
                updateData.newPassword = editInfo.newPassword;
            }

            //llamar al servicio para actualizar
            const result = await authService.updateUserProfile(updateData);

            if(isErrorResponse(result)){
                setError(result.error);
            } else if(result.success){
                //actualizar el estado local
                setUserInfo({
                    username: editInfo.username,
                    email: editInfo.email,
                    password: '********'
                });

                setIsEditing(false);
                setShowSuccess(true);
                setShowPassword(false);

                //ocultar mensaje de exito despues de 3 segundos
                setTimeout(() => setShowSuccess(false), 3000);
            }
        } catch (err) {
            logger.error('Error al actualizar perfil', err, { operation: 'updateUserProfile' });
            setError('Error al actualizar el perfil. Intenta de nuevo.');
        }finally{
            setLoading(false);
        }
    };

    if (loading && !userInfo.username) {
        return (
            <div className="min-vh-100 bg-light d-flex align-items-center justify-content-center">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Cargando...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="profile-container">
            <div className="container">
                <div className="row justify-content-center">
                    <div className="col-lg-8 col-xl-7">

                        {/* Alerta de éxito */}
                        {showSuccess && (
                            <div className="alert alert-success alert-dismissible fade show" role="alert">
                                <i className="bi bi-check-circle-fill me-2"></i>
                                ¡Perfil actualizado exitosamente!
                                <button type="button" className="btn-close" onClick={() => setShowSuccess(false)}></button>
                            </div>
                        )}

                         {/* Alerta de error */}
                         {error && (
                            <div className="alert alert-danger alert-dismissible fade show" role="alert">
                                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                                {error}
                                <button type="button" className="btn-close" onClick={() => setError(null)}></button>
                            </div>
                        )}

                        {/* Tarjeta de perfil */}
                        <div className="card profile-card">
                            <div className="card-header profile-card-header py-3">
                                <div className="d-flex align-items-center justify-content-between">
                                    <div className="d-flex align-items-center">
                                        <div className="profile-icon-container rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: '50px', height: '50px' }}>
                                            <i className="bi bi-person-fill fs-3"></i>
                                        </div>
                                        <div>
                                            <h5 className="mb-0">Mi Perfil</h5>
                                            <small className="opacity-75">Información de la cuenta</small>
                                        </div>
                                    </div>
                                    {!isEditing && (
                                        <button className="btn btn-light btn-sm" onClick={handleEdit}>
                                            <i className="bi bi-pencil-fill me-1"></i>
                                            Editar
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="card-body profile-card-body">
                                {!isEditing ? (
                                    //vista de solo lectura
                                    <div>
                                        <div className="mb-4">
                                            <label className="small mb-1">Nombre de usuario</label>
                                            <div className="d-flex align-items-center">
                                                <i className="bi bi-person text-primary me-2"></i>
                                                <h6 className="mb-0">{userInfo.username}</h6>
                                            </div>
                                        </div>

                                        <div className="mb-4">
                                            <label className="small mb-1">Correo electrónico</label>
                                            <div className="d-flex align-items-center">
                                                <i className="bi bi-envelope text-primary me-2"></i>
                                                <h6 className="mb-0">{userInfo.email}</h6>
                                            </div>
                                        </div>

                                        <div className="mb-3">
                                            <label className="small mb-1">Contraseña</label>
                                            <div className="d-flex align-items-center">
                                                <i className="bi bi-lock text-primary me-2"></i>
                                                <h6 className="mb-0">{userInfo.password}</h6>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    //formulario de edicion
                                    <div>
                                        <div className="mb-3">
                                            <label className="form-label fw-semibold">
                                                <i className="bi bi-person me-1"></i>
                                                Nombre de usuario
                                            </label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                name="username"
                                                value={editInfo.username}
                                                onChange={handleChange}
                                                required
                                            />
                                        </div>

                                        <div className="mb-4">
                                            <label className="form-label fw-semibold">
                                                <i className="bi bi-envelope me-1"></i>
                                                Correo electrónico
                                            </label>
                                            <input
                                                type="email"
                                                className="form-control"
                                                name="email"
                                                value={editInfo.email}
                                                onChange={handleChange}
                                                required
                                            />
                                        </div>

                                        <hr className="my-4" />

                                        <h6 className="mb-3">
                                            <i className="bi bi-shield-lock me-2"></i>
                                            Cambiar contraseña (opcional)
                                        </h6>

                                        <div className="mb-3">
                                            <label className="form-label">Contraseña actual</label>
                                            <div className="input-group">
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    className="form-control"
                                                    name="currentPassword"
                                                    value={editInfo.currentPassword}
                                                    onChange={handleChange}
                                                    placeholder="Ingresa tu contraseña actual"
                                                />
                                                <button
                                                    className="btn btn-outline-secondary"
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                >
                                                    <i className={`bi bi-eye${showPassword ? '-slash' : ''}`}></i>
                                                </button>
                                            </div>
                                        </div>

                                        <div className="mb-3">
                                            <label className="form-label">Nueva contraseña</label>
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                className="form-control"
                                                name="newPassword"
                                                value={editInfo.newPassword}
                                                onChange={handleChange}
                                                placeholder="Mínimo 8 caracteres"
                                            />
                                        </div>

                                        <div className="mb-4">
                                            <label className="form-label">Confirmar nueva contraseña</label>
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                className="form-control"
                                                name="confirmPassword"
                                                value={editInfo.confirmPassword}
                                                onChange={handleChange}
                                                placeholder="Repite la nueva contraseña"
                                            />
                                        </div>

                                        <div className="d-flex gap-2 justify-content-end">
                                            <button
                                                type="button"
                                                className="btn btn-secondary"
                                                onClick={handleCancel}
                                            >
                                                <i className="bi bi-x-lg me-1"></i>
                                                Cancelar
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-primary"
                                                onClick={handleSave}
                                            >
                                                <i className="bi bi-check-lg me-1"></i>
                                                Guardar cambios
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {!isEditing && (
                                <div className="card-footer small">
                                    <i className="bi bi-info-circle me-1"></i>
                                    Última actualización: {new Date().toLocaleDateString('es-ES')}
                                </div>
                            )}
                        </div>


                        <div className="card mt-3 border-0 bg-transparent profile-card">
                            <div className="card-body text-center">
                                <small className="">
                                    <i className="bi bi-shield-check me-1"></i>
                                    Tu información está protegida y segura
                                </small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>


            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css" />
        </div>
    );
};

export default UserProfile;