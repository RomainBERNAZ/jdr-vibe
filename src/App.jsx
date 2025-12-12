import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import CampaignEditPage from './pages/CampaignEditPage';
import CampaignPlayPage from './pages/CampaignPlayPage';
import AssetsPage from './pages/AssetsPage';

function PrivateRoute({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" />;
}

function AppContent() {
  const { token } = useAuth();
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
     <Routes>
        <Route path="/login" element={!token ? <AuthPage /> : <Navigate to="/" />} />
        <Route path="/" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="/campaigns/:id/edit" element={<PrivateRoute><CampaignEditPage /></PrivateRoute>} />
        <Route path="/campaigns/:id/play" element={<PrivateRoute><CampaignPlayPage /></PrivateRoute>} />
        <Route path="/assets" element={<PrivateRoute><AssetsPage /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
     </Routes>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}
