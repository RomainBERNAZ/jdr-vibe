import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

const AuthPage = lazy(() => import('./pages/AuthPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const CampaignEditPage = lazy(() => import('./pages/CampaignEditPage'));
const CampaignPlayPage = lazy(() => import('./pages/CampaignPlayPage'));

function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="p-10 text-center">Chargement...</div>;
  return isAuthenticated ? children : <Navigate to="/login" />;
}

function AppContent() {
  const { isAuthenticated, loading } = useAuth();
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <Suspense fallback={<div className="p-10 text-center">Chargement...</div>}>
        <Routes>
          <Route path="/login" element={loading ? <div className="p-10 text-center">Chargement...</div> : !isAuthenticated ? <AuthPage /> : <Navigate to="/" />} />
          <Route path="/" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
          <Route path="/campaigns/:id/edit" element={<PrivateRoute><CampaignEditPage /></PrivateRoute>} />
          <Route path="/campaigns/:id/play" element={<PrivateRoute><CampaignPlayPage /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
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
