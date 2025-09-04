import re
from typing import Tuple, List

class PasswordValidator:
    def __init__(self):
        self.min_length = 8
        self.max_length = 128
        self.require_uppercase = True
        self.require_lowercase = True
        self.require_digits = True
        self.require_special_chars = True
        self.special_chars = "!@#$%^&*()_+-=[]{}|;:,.<>?"
    
    def validate_password(self, password: str) -> Tuple[bool, List[str]]:
        """
        Valida una contraseña según las reglas de seguridad
        Retorna: (es_válida, lista_de_errores)
        """
        errors = []
        
        #verificar longitud mínima
        if len(password) < self.min_length:
            errors.append(f"La contraseña debe tener al menos {self.min_length} caracteres")
        
        #verificar longitud máxima
        if len(password) > self.max_length:
            errors.append(f"La contraseña no puede tener más de {self.max_length} caracteres")
        
        #verificar mayúsculas
        if self.require_uppercase and not re.search(r'[A-Z]', password):
            errors.append("La contraseña debe contener al menos una letra mayúscula")
        
        #verificar minúsculas
        if self.require_lowercase and not re.search(r'[a-z]', password):
            errors.append("La contraseña debe contener al menos una letra minúscula")
        
        #verificar dígitos
        if self.require_digits and not re.search(r'\d', password):
            errors.append("La contraseña debe contener al menos un número")
        
        #verificar caracteres especiales
        if self.require_special_chars and not re.search(f'[{re.escape(self.special_chars)}]', password):
            errors.append("La contraseña debe contener al menos un carácter especial (!@#$%^&*()_+-=[]{}|;:,.<>?)")
        
        #verificar espacios (no permitidos)
        if ' ' in password:
            errors.append("La contraseña no puede contener espacios")
        
        #verificar caracteres no permitidos
        if re.search(r'[^\w!@#$%^&*()_+\-=\[\]{}|;:,.<>?]', password):
            errors.append("La contraseña contiene caracteres no permitidos")
        
        return len(errors) == 0, errors
    
    def get_password_strength(self, password: str) -> str:
        """
        Evalúa la fortaleza de una contraseña
        Retorna: 'débil', 'media', 'fuerte', 'muy_fuerte'
        """
        score = 0
        
        #longitud
        if len(password) >= 8:
            score += 1
        if len(password) >= 12:
            score += 1
        if len(password) >= 16:
            score += 1
        
        #complejidad
        if re.search(r'[A-Z]', password):
            score += 1
        if re.search(r'[a-z]', password):
            score += 1
        if re.search(r'\d', password):
            score += 1
        if re.search(f'[{re.escape(self.special_chars)}]', password):
            score += 1
        
        #variedad de caracteres
        unique_chars = len(set(password))
        if unique_chars >= 8:
            score += 1
        if unique_chars >= 12:
            score += 1
        
        #evaluar score
        if score <= 3:
            return "débil"
        elif score <= 5:
            return "media"
        elif score <= 7:
            return "fuerte"
        else:
            return "muy_fuerte"
    
    def get_password_requirements(self) -> dict:
        """
        Retorna los requisitos de contraseña para mostrar al usuario
        """
        return {
            "min_length": self.min_length,
            "max_length": self.max_length,
            "require_uppercase": self.require_uppercase,
            "require_lowercase": self.require_lowercase,
            "require_digits": self.require_digits,
            "require_special_chars": self.require_special_chars,
            "special_chars": self.special_chars
        }

#instancia global del validador
password_validator = PasswordValidator()
