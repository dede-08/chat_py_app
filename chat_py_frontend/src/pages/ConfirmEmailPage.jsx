import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import authService from '../services/authService';
import './ConfirmEmailPage.css';

const ConfirmEmailPage = () => {
    const { token } = useParams();
    const [status, setStatus] = useState('loading'); //loading, success, error
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (token) {
            authService.confirmEmail(token)
                .then(response => {
                    setStatus('success');
                    setMessage(response.data.message || '¡Tu correo ha sido confirmado exitosamente!');
                })
                .catch(error => {
                    setStatus('error');
                    setMessage(error.response?.data?.detail || 'Ocurrió un error al confirmar tu correo.');
                });
        }
    }, [token]);

    return (
        <div className="confirm-email-container">
            <div className="confirm-email-card">
                {status === 'loading' && (
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" role="status">
                        <span className="sr-only">Confirmando...</span>
                    </div>
                )}
                {status !== 'loading' && (
                    <div className={`icon ${status}`}>
                        {status === 'success' ? '✔' : '✖'}
                    </div>
                )}
                <h2 className="mt-3">{
                    status === 'loading' ? 'Confirmando tu correo...'
                    : status === 'success' ? '¡Confirmación Exitosa!'
                    : 'Error de Confirmación'
                }</h2>
                <p className="mt-2">{message}</p>
                {status !== 'loading' && (
                    <Link to="/login" className="premium-btn mt-6 inline-block w-auto px-6">
                        Ir a Iniciar Sesión
                    </Link>
                )}
            </div>
        </div>
    );
};

export default ConfirmEmailPage;
