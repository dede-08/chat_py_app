import React, { useState, useEffect } from 'react';
import './PasswordStrengthMeter.css';

const PasswordStrengthMeter = ({ password, requirements, onValidationChange }) => {
  const [strength, setStrength] = useState('débil');
  const [errors, setErrors] = useState([]);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    if (!password) {
      setStrength('débil');
      setErrors([]);
      setIsValid(false);
      onValidationChange && onValidationChange(false, []);
      return;
    }

    // Validación en tiempo real
    const validationErrors = [];
    
    // Longitud mínima
    if (requirements?.min_length && password.length < requirements.min_length) {
      validationErrors.push(`Al menos ${requirements.min_length} caracteres`);
    }
    
    // Longitud máxima
    if (requirements?.max_length && password.length > requirements.max_length) {
      validationErrors.push(`Máximo ${requirements.max_length} caracteres`);
    }
    
    // Mayúsculas
    if (requirements?.require_uppercase && !/[A-Z]/.test(password)) {
      validationErrors.push('Al menos una mayúscula');
    }
    
    // Minúsculas
    if (requirements?.require_lowercase && !/[a-z]/.test(password)) {
      validationErrors.push('Al menos una minúscula');
    }
    
    // Números
    if (requirements?.require_digits && !/\d/.test(password)) {
      validationErrors.push('Al menos un número');
    }
    
    // Caracteres especiales
    if (requirements?.require_special_chars && requirements?.special_chars) {
      const specialCharsRegex = new RegExp(`[${requirements.special_chars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`);
      if (!specialCharsRegex.test(password)) {
        validationErrors.push('Al menos un carácter especial');
      }
    }
    
    // Espacios
    if (password.includes(' ')) {
      validationErrors.push('No puede contener espacios');
    }

    setErrors(validationErrors);
    setIsValid(validationErrors.length === 0);

    // Calcular fortaleza
    let score = 0;
    
    // Longitud
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;
    
    // Complejidad
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (requirements?.special_chars && new RegExp(`[${requirements.special_chars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`).test(password)) score += 1;
    
    // Variedad
    const uniqueChars = new Set(password).size;
    if (uniqueChars >= 8) score += 1;
    if (uniqueChars >= 12) score += 1;

    // Determinar fortaleza
    let newStrength;
    if (score <= 3) newStrength = 'débil';
    else if (score <= 5) newStrength = 'media';
    else if (score <= 7) newStrength = 'fuerte';
    else newStrength = 'muy_fuerte';

    setStrength(newStrength);
    onValidationChange && onValidationChange(validationErrors.length === 0, validationErrors);

  }, [password, requirements]);

  const getStrengthColor = () => {
    switch (strength) {
      case 'débil': return '#ff4444';
      case 'media': return '#ffaa00';
      case 'fuerte': return '#00aa00';
      case 'muy_fuerte': return '#008800';
      default: return '#cccccc';
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
    switch (strength) {
      case 'débil': return '25%';
      case 'media': return '50%';
      case 'fuerte': return '75%';
      case 'muy_fuerte': return '100%';
      default: return '0%';
    }
  };

  if (!password) return null;

  return (
    <div className="password-strength-meter">
      <div className="strength-bar">
        <div 
          className="strength-fill"
          style={{ 
            width: getStrengthWidth(),
            backgroundColor: getStrengthColor()
          }}
        />
      </div>
      
      <div className="strength-info">
        <span className="strength-text" style={{ color: getStrengthColor() }}>
          {getStrengthText()}
        </span>
      </div>

      {errors.length > 0 && (
        <div className="password-errors">
          <h6>Requisitos faltantes:</h6>
          <ul>
            {errors.map((error, index) => (
              <li key={index} className="error-item">
                ❌ {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {isValid && (
        <div className="password-valid">
          <span className="valid-icon">✅</span>
          <span className="valid-text">Contraseña válida</span>
        </div>
      )}
    </div>
  );
};

export default PasswordStrengthMeter;
