import { React, useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/navbar-component/Navbar';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import './App.css'
import 'bootstrap/dist/css/bootstrap.min.css';
import ChatPage from './pages/ChatPage';
import Sidebar from './components/sidebar-component/Sidebar';
import authService from './services/authService';
import { ChatProvider } from './context';

//componente para proteger rutas que requieren autenticación
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = authService.isAuthenticated();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    //verificar autenticación al cargar la app
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return <div className="loading">Cargando...</div>;
  }

  return (
    <Router>
      <Navbar />
      
      <Routes>
        <Route path='/' element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path='/chat' element={
          <ProtectedRoute>
            <ChatProvider>
              <ChatPage />
              
            </ChatProvider>
          </ProtectedRoute>
        } />
        <Route path='/profile' element ={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        } />
      </Routes>
      
    </Router>
  );
}

export default App
