import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import authService from '../../services/authService';
import logger from '../../services/logger';
import 'bootstrap/dist/css/bootstrap.min.css';

const Navbar = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    //verificar estado de autenticacion
    const checkAuth = () => {
      const authenticated = authService.isAuthenticated();
      setIsAuthenticated(authenticated);
      if (authenticated) {
        setUsername(authService.getUsername() || 'Usuario');
      }
    };

    checkAuth();
    //escuchar cambios en el localStorage
    window.addEventListener('storage', checkAuth);

    return () => {
      window.removeEventListener('storage', checkAuth);
    };
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      //llamar al endpoint de logout del backend
      await authService.logoutUser();

      //limpiar estado local
      setIsAuthenticated(false);
      setUsername('');

      //redirigir al login
      navigate('/login');
    } catch (error) {
      logger.error('Error durante el logout', error, { operation: 'handleLogout' });
      //limpiar el estado local (logoutUser ya limpia localStorage en el finally)
      setIsAuthenticated(false);
      setUsername('');
      navigate('/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
      <div className="container">
        <Link className="navbar-brand" to="/">ChatPy</Link>
        <div className="collapse navbar-collapse">
          <ul className="navbar-nav ms-auto">
            {isAuthenticated ? (
              <>
                <li className="nav-item">
                  <Link className="nav-link" to="/chat">Chat</Link>
                </li>
                <li className="nav-item dropdown">
                  <a className="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                    {username}
                  </a>
                  <ul className="dropdown-menu">
                    <li><Link className="dropdown-item" to="/profile">Perfil</Link></li>
                    <li><button
                    className="dropdown-item"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                  >
                    {isLoggingOut ? 'logging out...' : 'Cerrar Sesión'}
                  </button></li>
                  </ul>
                </li>
                
              </>
            ) : (
              <>
                <li className="nav-item">
                  <Link className="nav-link" to="/login">Iniciar Sesión</Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/register">Registrarse</Link>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
