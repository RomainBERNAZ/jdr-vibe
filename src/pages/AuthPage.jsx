import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';

export default function AuthPage() {
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let data;
      if (isLogin) {
        data = await authApi.login(email, password);
        login(data.token, data.user);
      } else {
        // Register then auto-login
        await authApi.register(email, password);
        const loginData = await authApi.login(email, password);
        login(loginData.token, loginData.user);
      }
    } catch (err) {
      setError(err.error || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,_var(--tw-gradient-stops))] from-indigo-900/40 via-zinc-950 to-zinc-950" />
        <div className="w-full max-w-md bg-zinc-900/80 backdrop-blur border border-zinc-800 p-8 rounded-2xl shadow-2xl relative z-10">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-white mb-2 flex justify-center items-center gap-2">
                    <Sparkles className="text-indigo-500" /> Aether
                </h1>
                <p className="text-zinc-500">Votre portail vers l'aventure.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <input 
                    type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-3 focus:border-indigo-500 outline-none"
                />
                <input 
                    type="password" placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-3 focus:border-indigo-500 outline-none"
                />
                {error && <p className="text-red-400 text-sm">{error}</p>}
                
                <button disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 py-3 rounded-lg font-bold transition-all flex justify-center">
                    {loading ? <Loader2 className="animate-spin" /> : (isLogin ? 'Connexion' : 'Inscription')}
                </button>
            </form>
            
            <button onClick={() => setIsLogin(!isLogin)} className="w-full text-center mt-4 text-zinc-500 hover:text-white text-sm">
                {isLogin ? "Pas de compte ? Créer une aventure" : "Déjà membre ? Se connecter"}
            </button>
        </div>
    </div>
  );
}

