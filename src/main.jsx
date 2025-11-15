import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App.jsx';
import { Login } from './components/Login';
import { ProtectedRoute } from './components/ProtectedRoute';
import './index.css';
import { isAuthenticated } from './lib/auth';

// Handle initial auth redirect
function InitialRedirect() {
  return isAuthenticated() ? <Navigate to="/" replace /> : <Navigate to="/login" replace />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProtectedRoute><App /></ProtectedRoute>} />
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<InitialRedirect />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
