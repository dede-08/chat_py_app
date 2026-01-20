import React, { useState, useEffect } from 'react';
import './PasswordStrengthMeter.css';

const PasswordStrengthMeter = ({ password, requirements, onValidationChange }) => {
  const [strength, setStrength] = useState('débil');
  const [errors, setErrors] = useState([]);
  const [isValid, setIsValid] = useState(false);
  const [score, setScore] = useState(0);
  const [maxScore, setMaxScore] = useState(8);

  useEffect(() => {
    if (!password) {
      setStrength('débil');
      setErrors([]);
      setIsValid(false);
      setScore(0);
      onValidationChange && onValidationChange(false, []);
      return;
    }

    //validacion en tiempo real
    const validationErrors = [];
    
    //longitud minima
    if (requirements?.min_length && password.length < requirements.min_length) {
      validationErrors.push(`Al menos ${requirements.min_length} caracteres`);
    }
    
    //longitud maxima
    if (requirements?.max_length && password.length > requirements.max_length) {
      validationErrors.push(`Máximo ${requirements.max_length} caracteres`);
    }
    
    //mayusculas
    if (requirements?.require_uppercase && !/[A-Z]/.test(password)) {
      validationErrors.push('Al menos una mayúscula');
    }
    
    //minusculas
    if (requirements?.require_lowercase && !/[a-z]/.test(password)) {
      validationErrors.push('Al menos una minúscula');
    }
    
    //numeros
    if (requirements?.require_digits && !/\d/.test(password)) {
      validationErrors.push('Al menos un número');
    }
    
    //caracteres especiales
    if (requirements?.require_special_chars && requirements?.special_chars) {
      const specialCharsRegex = new RegExp(`[${requirements.special_chars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`);
      if (!specialCharsRegex.test(password)) {
        validationErrors.push('Al menos un carácter especial');
      }
    }
    
    //espacios
    if (password.includes(' ')) {
      validationErrors.push('No puede contener espacios');
    }

    setErrors(validationErrors);
    setIsValid(validationErrors.length === 0);

    //calcular fortaleza
    let currentScore = 0;
    
    //longitud (maximo 3 puntos)
    if (password.length >= 8) currentScore += 1;
    if (password.length >= 12) currentScore += 1;
    if (password.length >= 16) currentScore += 1;
    
    //complejidad (maximo 4 puntos)
    if (/[A-Z]/.test(password)) currentScore += 1;
    if (/[a-z]/.test(password)) currentScore += 1;
    if (/\d/.test(password)) currentScore += 1;
    if (requirements?.special_chars && new RegExp(`[${requirements.special_chars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`).test(password)) currentScore += 1;
    
    //variedad (maximo 1 punto)
    const uniqueChars = new Set(password).size;
    if (uniqueChars >= 8) currentScore += 1;

    setScore(currentScore);
    setMaxScore(8);

    //determinar fortaleza
    let newStrength;
    if (currentScore <= 2) newStrength = 'débil';
    else if (currentScore <= 4) newStrength = 'media';
    else if (currentScore <= 6) newStrength = 'fuerte';
    else newStrength = 'muy_fuerte';

    setStrength(newStrength);
    onValidationChange && onValidationChange(validationErrors.length === 0, validationErrors);

  }, [password, requirements, onValidationChange]);

  const getStrengthColor = () => {
    switch (strength) {
      case 'débil': return '#dc3545';
      case 'media': return '#ffc107';
      case 'fuerte': return '#28a745';
      case 'muy_fuerte': return '#198754';
      default: return '#6c757d';
    }
  };

  const getStrengthText = () => {
    switch (strength) {
      case 'débil': return 'Débil';
      case 'media': return 'Media';
      case 'fuerte': return 'Fuerte';
      case 'muy_fuerte': return 'Muy Fuerte';
      default: return 'Débil';
    }
  };

  const getStrengthWidth = () => {
    return `${(score / maxScore) * 100}%`;
  };

  const getStrengthIcon = () => {
    switch (strength) {
      case 'débil': return '';
      case 'media': return '⚡';
      case 'fuerte': return '🛡️';
      case 'muy_fuerte': return '🔒';
      default: return '❓';
    }
  };

  const getStrengthDescription = () => {
    switch (strength) {
      case 'débil': return 'Fácil de adivinar';
      case 'media': return 'Mejorable';
      case 'fuerte': return 'Buena seguridad';
      case 'muy_fuerte': return 'Excelente seguridad';
      default: return '';
    }
  };

  if (!password) return null;

  return (
    <div className="password-strength-meter">
      <div className="strength-header">
        <span className="strength-icon">{getStrengthIcon()}</span>
        <span className="strength-text" style={{ color: getStrengthColor() }}>
          {getStrengthText()}
        </span>
        <span className="strength-description">- {getStrengthDescription()}</span>
      </div>
      
      <div className="strength-bar-container">
        <div className="strength-bar">
          <div 
            className="strength-fill"
            style={{ 
              width: getStrengthWidth(),
              backgroundColor: getStrengthColor()
            }}
          />
        </div>
        <span className="strength-score">{score}/{maxScore}</span>
      </div>

      {errors.length > 0 && (
        <div className="password-errors">
          <h6 className="errors-title">Requisitos faltantes:</h6>
          <ul className="errors-list">
            {errors.map((error, index) => (
              <li key={index} className="error-item">
                <span className="error-icon">❌</span>
                <span className="error-text">{error}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isValid && (
        <div className="password-valid">
          <span className="valid-icon">✅</span>
          <span className="valid-text">¡Contraseña válida y segura!</span>
        </div>
      )}
    </div>
  );
};

export default PasswordStrengthMeter;
