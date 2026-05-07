import { useEffect, useState } from 'react';
import './PasswordStrengthMeter.css';
import type { PasswordRequirements } from '../../types';

interface PasswordStrengthMeterProps {
  password: string;
  requirements: PasswordRequirements | null;
  onValidationChange?: (isValid: boolean, errors: string[]) => void;
}

const PasswordStrengthMeter = ({ password, requirements, onValidationChange }: PasswordStrengthMeterProps) => {
  const [strength, setStrength] = useState('debil');
  const [errors, setErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(false);
  const [score, setScore] = useState(0);
  const [maxScore, setMaxScore] = useState(8);

  useEffect(() => {
    if (!password) {
      setStrength('debil');
      setErrors([]);
      setIsValid(false);
      setScore(0);
      onValidationChange?.(false, []);
      return;
    }

    const validationErrors: string[] = [];

    if (requirements?.min_length && password.length < requirements.min_length) validationErrors.push(`Al menos ${requirements.min_length} caracteres`);
    if (requirements?.max_length && password.length > requirements.max_length) validationErrors.push(`Máximo ${requirements.max_length} caracteres`);
    if (requirements?.require_uppercase && !/[A-Z]/.test(password)) validationErrors.push('Al menos una mayúscula');
    if (requirements?.require_lowercase && !/[a-z]/.test(password)) validationErrors.push('Al menos una minúscula');
    if (requirements?.require_digits && !/\d/.test(password)) validationErrors.push('Al menos un número');
    if (requirements?.require_special_chars && requirements?.special_chars) {
      const specialCharsRegex = new RegExp(`[${requirements.special_chars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`);
      if (!specialCharsRegex.test(password)) validationErrors.push('Al menos un carácter especial');
    }
    if (password.includes(' ')) validationErrors.push('No puede contener espacios');

    setErrors(validationErrors);
    setIsValid(validationErrors.length === 0);

    let currentScore = 0;
    if (password.length >= 8) currentScore += 1;
    if (password.length >= 12) currentScore += 1;
    if (password.length >= 16) currentScore += 1;
    if (/[A-Z]/.test(password)) currentScore += 1;
    if (/[a-z]/.test(password)) currentScore += 1;
    if (/\d/.test(password)) currentScore += 1;
    if (requirements?.special_chars && new RegExp(`[${requirements.special_chars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`).test(password)) currentScore += 1;
    if (new Set(password).size >= 8) currentScore += 1;

    setScore(currentScore);
    setMaxScore(8);

    let newStrength;
    if (currentScore <= 2) newStrength = 'debil';
    else if (currentScore <= 4) newStrength = 'media';
    else if (currentScore <= 6) newStrength = 'fuerte';
    else newStrength = 'muy_fuerte';

    setStrength(newStrength);
    onValidationChange?.(validationErrors.length === 0, validationErrors);
  }, [password, requirements, onValidationChange]);

  const getStrengthColor = () => {
    switch (strength) {
      case 'debil':
        return '#dc3545';
      case 'media':
        return '#ffc107';
      case 'fuerte':
        return '#28a745';
      case 'muy_fuerte':
        return '#198754';
      default:
        return '#6c757d';
    }
  };

  const getStrengthText = () => {
    switch (strength) {
      case 'debil':
        return 'Debil';
      case 'media':
        return 'Media';
      case 'fuerte':
        return 'Fuerte';
      case 'muy_fuerte':
        return 'Muy Fuerte';
      default:
        return 'Debil';
    }
  };

  const getStrengthDescription = () => {
    switch (strength) {
      case 'debil':
        return 'Fácil de adivinar';
      case 'media':
        return 'Mejorable';
      case 'fuerte':
        return 'Buena seguridad';
      case 'muy_fuerte':
        return 'Excelente seguridad';
      default:
        return '';
    }
  };

  if (!password) return null;

  return (
    <div className="password-strength-meter">
      <div className="strength-header">
        <span className="strength-text" style={{ color: getStrengthColor() }}>
          {getStrengthText()}
        </span>
        <span className="strength-description">- {getStrengthDescription()}</span>
      </div>

      <div className="strength-bar-container">
        <div className="strength-bar">
          <div className="strength-fill" style={{ width: `${(score / maxScore) * 100}%`, backgroundColor: getStrengthColor() }} />
        </div>
        <span className="strength-score">
          {score}/{maxScore}
        </span>
      </div>

      {errors.length > 0 && (
        <div className="password-errors">
          <h6 className="errors-title">Requisitos faltantes:</h6>
          <ul className="errors-list">
            {errors.map((err, index) => (
              <li key={index} className="error-item">
                <span className="material-symbols-outlined error-icon">error</span>
                <span className="error-text">{err}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isValid && (
        <div className="password-valid">
          <span className="material-symbols-outlined valid-icon">check_circle</span>
          <span className="valid-text">Contraseña válida y segura!</span>
        </div>
      )}
    </div>
  );
};

export default PasswordStrengthMeter;
