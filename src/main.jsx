import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App.jsx';
import { Login } from './components/Login';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PublicCatalogue } from './components/PublicCatalogue';
import './index.css';
import { isAuthenticated } from './lib/auth';

// Handle initial auth redirect
function InitialRedirect() {
  return isAuthenticated()
    ? <Navigate to="/star-kidswear/" replace />
    : <Navigate to="/star-kidswear/catalogue" replace />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/star-kidswear/" element={<ProtectedRoute><App /></ProtectedRoute>} />
        <Route path="/star-kidswear/catalogue" element={<PublicCatalogue />} />
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<InitialRedirect />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
