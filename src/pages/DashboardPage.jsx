import React, { useState, useEffect } from 'react';
import { Sparkles, Sword, LogOut, Plus, Eye, Play } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { campaignApi } from '../services/api';
import { useNavigate } from 'react-router-dom';
import VoiceInput from '../components/VoiceInput';

export default function DashboardPage() {
    const { user, token, logout } = useAuth();
    const [campaigns, setCampaigns] = useState([]);
    const [newCampName, setNewCampName] = useState('');
    const navigate = useNavigate();
    
    useEffect(() => {
        if(token) {
            campaignApi.list(token)
                .then(data => setCampaigns(Array.isArray(data) ? data : []))
                .catch(console.error);
        }
    }, [token]);

    const handleCreate = async (e) => {
        e.preventDefault();
        if(!newCampName) return;
        
        try {
            const newCamp = await campaignApi.create(token, newCampName);
            setCampaigns([newCamp, ...campaigns]);
            setNewCampName('');
        } catch (err) {
            console.error("Failed to create campaign", err);
        }
    };

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-6 w-full overflow-hidden">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 md:mb-12 py-4 md:py-6 border-b border-zinc-800 gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                        <Sparkles className="text-white w-6 h-6" />
                    </div>
                    <span className="text-xl font-bold">Aether Table</span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-zinc-400">{user?.email}</span>
                    <button onClick={logout} className="p-2 hover:bg-zinc-800 rounded-lg"><LogOut className="w-5 h-5" /></button>
                </div>
            </header>

            <VoiceInput />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
                <h2 className="text-2xl font-bold">Campagnes Actives</h2>
                <form onSubmit={handleCreate} className="flex gap-2 w-full md:w-auto">
                    <input 
                        value={newCampName} onChange={e => setNewCampName(e.target.value)}
                        placeholder="Nouvelle campagne..." 
                        className="bg-zinc-900 border border-zinc-700 px-4 py-2 rounded-lg outline-none focus:border-indigo-500 flex-1 md:w-64"
                    />
                    <button className="bg-white text-black px-4 py-2 rounded-lg font-bold hover:bg-zinc-200 shrink-0">
                        <Plus className="w-5 h-5" />
                    </button>
                </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {campaigns.map(camp => (
                    <div key={camp.id} className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl hover:border-indigo-500/50 transition-all group relative">
                        <div className="flex justify-between items-start mb-4">
                            <button 
                                onClick={() => navigate(`/campaigns/${camp.id}/edit`)}
                                className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center hover:bg-indigo-600 transition-colors"
                                title="Modifier la campagne"
                            >
                                <Sword className="w-5 h-5" />
                            </button>
                            <div className="flex gap-2">
                                <span className={`text-xs px-2 py-1 rounded border ${camp.status === 'active' ? 'border-green-500 text-green-500' : 'border-zinc-700 text-zinc-500'}`}>
                                    {camp.status || 'pending'}
                                </span>
                            </div>
                        </div>
                        <h3 className="font-bold text-lg mb-1">{camp.name}</h3>
                        <p className="text-zinc-500 text-sm mb-4">Créé le {new Date(camp.created_at).toLocaleDateString()}</p>
                        
                        <div className="flex justify-end mt-4 pt-4 border-t border-zinc-800/50">
                             <button 
                                onClick={() => navigate(`/campaigns/${camp.id}/play`)}
                                className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm font-medium"
                            >
                                <Play className="w-4 h-4" /> Lancer la session
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
