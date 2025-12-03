import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';

function AppContent() {
  const { token } = useAuth();
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      {token ? <DashboardPage /> : <AuthPage />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

