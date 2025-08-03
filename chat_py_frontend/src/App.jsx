import { React } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/navbar-component/Navbar';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import './App.css'
import 'bootstrap/dist/css/bootstrap.min.css';
import ChatPage from './pages/ChatPage';
import Sidebar from './components/sidebar-component/Sidebar';

function App() {
  return (
    <Router>
      <Navbar />
      
      <Routes>
        <Route path='/' element={<LoginPage  />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path='/chat' element={<ChatPage />}></Route>
      </Routes>
    </Router>
  );
}

export default App
