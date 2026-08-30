import { useEffect, useState, type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar/Navbar';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import ConfirmEmailPage from './pages/ConfirmEmailPage';
import './App.css';
import ChatPage from './pages/ChatPage';

import authService from './services/authService';
import { isErrorResponse } from './utils/errorHandler';
import { ChatProvider } from './context';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');

  useEffect(() => {
    const verifySession = async () => {
      if (!authService.isAuthenticated()) {
        setStatus('unauthenticated');
        return;
      }
      const result = await authService.getUserProfile();
      if (isErrorResponse(result)) {
        await authService.logoutUser();
        setStatus('unauthenticated');
        return;
      }
      setStatus('authenticated');
    };
    verifySession();
  }, []);

  if (status === 'loading') {
    return <div className="loading">Verificando sesión...</div>;
  }
  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <Navbar />

      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/confirm-email/:token" element={<ConfirmEmailPage />} />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <ChatProvider>
                <ChatPage />
              </ChatProvider>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
