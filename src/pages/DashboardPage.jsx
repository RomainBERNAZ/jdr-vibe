import React, { useState, useEffect } from 'react';
import { Sparkles, Sword, LogOut, Plus, Users, BarChart3, LayoutDashboard, Trash2, Edit, Upload, FolderOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { campaignApi, characterApi } from '../services/api';
import { useNavigate } from 'react-router-dom';
import CharacterCreationModal from '../components/CharacterCreationModal';
import AssetsPage from './AssetsPage';

const TabButton = ({ active, onClick, icon: Icon, label }) => (
    <button 
        onClick={onClick}
        className={`flex items-center gap-3 px-4 py-3 w-full rounded-lg transition-all ${
            active 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' 
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
        }`}
    >
        <Icon className="w-5 h-5" />
        <span className="font-medium">{label}</span>
    </button>
);

const CampaignList = ({ token, navigate }) => {
    const [campaigns, setCampaigns] = useState([]);
    const [newCampName, setNewCampName] = useState('');
    const [audioEnabled, setAudioEnabled] = useState(true);

    useEffect(() => {
        campaignApi.list(token)
            .then(data => setCampaigns(Array.isArray(data) ? data : []))
            .catch(console.error);
    }, [token]);

    const handleCreate = async (e) => {
        e.preventDefault();
        if(!newCampName) return;
        try {
            const newCamp = await campaignApi.create(token, { name: newCampName, audio_enabled: audioEnabled });
            setCampaigns([newCamp, ...campaigns]);
            setNewCampName('');
            setAudioEnabled(true);
        } catch (err) {
            console.error("Failed to create campaign", err);
        }
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        // Remplacement temporaire du confirm natif qui bloque
        // TODO: Implémenter une modale custom
        try {
            await campaignApi.delete(token, id);
            setCampaigns(prev => prev.filter(c => c.id !== id));
        } catch(err) {
            console.error("Erreur suppression:", err);
            alert("Erreur lors de la suppression : " + (err.message || "Erreur inconnue"));
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white">Vos Campagnes</h2>
                    <p className="text-zinc-400">Gérez vos aventures et invitez vos joueurs.</p>
                </div>
                <form onSubmit={handleCreate} className="flex flex-col gap-2 w-full md:w-auto">
                    <div className="flex gap-2">
                        <input 
                            value={newCampName} onChange={e => setNewCampName(e.target.value)}
                            placeholder="Nouvelle campagne..." 
                            className="bg-zinc-900 border border-zinc-700 px-4 py-2 rounded-lg outline-none focus:border-indigo-500 flex-1 md:w-64 text-white"
                        />
                        <button className="bg-white text-black px-4 py-2 rounded-lg font-bold hover:bg-zinc-200 shrink-0 flex items-center gap-2">
                            <Plus className="w-5 h-5" /> Créer
                        </button>
                    </div>
                    <label className="flex items-center gap-2 text-zinc-400 text-xs cursor-pointer select-none">
                        <input 
                            type="checkbox" 
                            checked={audioEnabled}
                            onChange={e => setAudioEnabled(e.target.checked)}
                            className="accent-indigo-600 rounded bg-zinc-800 border-zinc-700"
                        />
                        Activer la voix du MJ (Audio)
                    </label>
                </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {campaigns.map(camp => (
                    <div key={camp.id} className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl hover:border-indigo-500/50 transition-all group relative flex flex-col">
                        <div className="absolute top-2 right-2 flex gap-1 z-50 pointer-events-auto">
                             <button 
                                onClick={(e) => handleDelete(camp.id, e)}
                                className="p-1.5 bg-zinc-800 hover:bg-red-600 rounded text-zinc-400 hover:text-white transition-colors"
                                title="Supprimer"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center">
                                <Sword className="w-5 h-5 text-indigo-500" />
                            </div>
                            <span className={`text-xs px-2 py-1 rounded border ${camp.status === 'active' ? 'border-green-500 text-green-500' : 'border-zinc-700 text-zinc-500'}`}>
                                {camp.status || 'pending'}
                            </span>
                        </div>
                        <h3 className="font-bold text-lg mb-1 text-white">{camp.name}</h3>
                        <p className="text-zinc-500 text-sm mb-4 flex-1">Créé le {new Date(camp.created_at).toLocaleDateString()}</p>
                        
                        <div className="flex gap-2 mt-4 pt-4 border-t border-zinc-800/50">
                            <button 
                                onClick={() => navigate(`/campaigns/${camp.id}/edit`)}
                                className="flex-1 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300 transition-colors"
                            >
                                Modifier
                            </button>
                            <button 
                                onClick={() => navigate(`/campaigns/${camp.id}/play`)}
                                className="flex-1 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 rounded text-white font-medium transition-colors"
                            >
                                Jouer
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const CharacterList = ({ token }) => {
    const [characters, setCharacters] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [editingChar, setEditingChar] = useState(null);

    useEffect(() => {
        characterApi.list(token)
            .then(data => setCharacters(Array.isArray(data) ? data : []))
            .catch(console.error);
    }, [token]);

    const handleCreateOrUpdate = async (charData) => {
        try {
            if (editingChar) {
                const updated = await characterApi.update(token, editingChar.id, charData);
                setCharacters(characters.map(c => c.id === editingChar.id ? updated : c));
            } else {
                const newChar = await characterApi.create(token, charData);
                setCharacters([newChar, ...characters]);
            }
            setShowCreate(false);
            setEditingChar(null);
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id) => {
        if(!window.confirm("Êtes-vous sûr de vouloir supprimer ce personnage ?")) return;
        try {
            await characterApi.delete(token, id);
            setCharacters(characters.filter(c => c.id !== id));
        } catch(err) {
            console.error(err);
        }
    };

    const openEdit = (char) => {
        setEditingChar(char);
        setShowCreate(true);
    };

    const closeModal = () => {
        setShowCreate(false);
        setEditingChar(null);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-white">Vos Personnages</h2>
                    <p className="text-zinc-400">Créez et gérez vos héros.</p>
                </div>
                <button 
                    onClick={() => { setEditingChar(null); setShowCreate(true); }}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-500 flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" /> Nouveau Personnage
                </button>
            </div>

            {showCreate && (
                <CharacterCreationModal 
                    onCreate={handleCreateOrUpdate} 
                    onCancel={closeModal}
                    initialData={editingChar}
                />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {characters.map(char => (
                    <div key={char.id} className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl hover:border-indigo-500/50 transition-all group relative">
                         <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                                onClick={() => openEdit(char)}
                                className="p-1.5 bg-zinc-800 hover:bg-indigo-600 rounded text-zinc-400 hover:text-white transition-colors"
                                title="Modifier"
                            >
                                <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button 
                                onClick={() => handleDelete(char.id)}
                                className="p-1.5 bg-zinc-800 hover:bg-red-600 rounded text-zinc-400 hover:text-white transition-colors"
                                title="Supprimer"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-lg text-white">{char.name}</h3>
                                <p className="text-indigo-400 text-sm">{char.race} {char.class}</p>
                            </div>
                            <span className="text-xs bg-zinc-800 px-2 py-1 rounded text-zinc-400">Niv. {char.level}</span>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                            <div className="bg-zinc-950 p-2 rounded">
                                <span className="block text-xs text-zinc-500">PV</span>
                                <span className="text-red-400 font-bold">{char.hp_current} / {char.hp_max}</span>
                            </div>
                            <div className="bg-zinc-950 p-2 rounded">
                                <span className="block text-xs text-zinc-500">Or</span>
                                <span className="text-amber-400 font-bold">{char.gold}</span>
                            </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-zinc-800 text-xs text-zinc-500 line-clamp-2">
                            {char.backstory || "Pas d'histoire..."}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const StatsPlaceholder = () => (
    <div className="flex flex-col items-center justify-center h-64 text-zinc-500 border-2 border-dashed border-zinc-800 rounded-xl bg-zinc-900/20">
        <BarChart3 className="w-12 h-12 mb-4 opacity-20" />
        <p className="text-lg font-medium">Statistiques Bientôt Disponibles</p>
        <p className="text-sm">Suivez vos jets de dés, dégâts et progression.</p>
    </div>
);

export default function DashboardPage() {
    const { user, token, logout } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('campaigns');

    return (
        <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
            {/* Sidebar */}
            <div className="w-64 bg-black border-r border-zinc-800 flex flex-col p-4 hidden md:flex">
                <div className="flex items-center gap-3 mb-8 px-2">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                        <Sparkles className="text-white w-5 h-5" />
                    </div>
                    <span className="text-lg font-bold tracking-tight">Aether Table</span>
                </div>

                <nav className="flex-1 space-y-2">
                    <TabButton 
                        active={activeTab === 'campaigns'} 
                        onClick={() => setActiveTab('campaigns')} 
                        icon={LayoutDashboard} 
                        label="Campagnes" 
                    />
                    <TabButton 
                        active={activeTab === 'characters'} 
                        onClick={() => setActiveTab('characters')} 
                        icon={Users} 
                        label="Personnages" 
                    />
                    <TabButton 
                        active={activeTab === 'stats'} 
                        onClick={() => setActiveTab('stats')} 
                        icon={BarChart3} 
                        label="Statistiques" 
                    />
                    <TabButton 
                        active={activeTab === 'assets'} 
                        onClick={() => setActiveTab('assets')} 
                        icon={FolderOpen} 
                        label="Assets" 
                    />
                </nav>

                <div className="border-t border-zinc-800 pt-4 mt-4">
                    <div className="px-4 py-2 mb-2">
                        <p className="text-sm font-medium text-white truncate">{user?.email}</p>
                        <p className="text-xs text-zinc-500">Compte Gratuit</p>
                    </div>
                    <button 
                        onClick={logout}
                        className="flex items-center gap-3 px-4 py-2 w-full rounded-lg text-zinc-400 hover:bg-red-900/20 hover:text-red-400 transition-colors text-sm"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>Déconnexion</span>
                    </button>
                </div>
            </div>

            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-black border-b border-zinc-800 flex items-center justify-between px-4 z-50">
                <Sparkles className="text-indigo-600 w-6 h-6" />
                <span className="font-bold">Aether Table</span>
                <button onClick={logout}><LogOut className="w-5 h-5 text-zinc-400" /></button>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative pt-16 md:pt-0">
                {/* Mobile Tabs */}
                <div className="md:hidden flex border-b border-zinc-800 bg-zinc-900 shrink-0 overflow-x-auto">
                    <button onClick={() => setActiveTab('campaigns')} className={`flex-1 p-3 text-sm font-bold whitespace-nowrap ${activeTab === 'campaigns' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-zinc-500'}`}>Campagnes</button>
                    <button onClick={() => setActiveTab('characters')} className={`flex-1 p-3 text-sm font-bold whitespace-nowrap ${activeTab === 'characters' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-zinc-500'}`}>Personnages</button>
                    <button onClick={() => setActiveTab('stats')} className={`flex-1 p-3 text-sm font-bold whitespace-nowrap ${activeTab === 'stats' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-zinc-500'}`}>Stats</button>
                    <button onClick={() => setActiveTab('assets')} className={`flex-1 p-3 text-sm font-bold whitespace-nowrap ${activeTab === 'assets' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-zinc-500'}`}>Assets</button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-8">
                    <div className="max-w-6xl mx-auto">
                        {activeTab === 'campaigns' && <CampaignList token={token} navigate={navigate} />}
                        {activeTab === 'characters' && <CharacterList token={token} />}
                        {activeTab === 'stats' && <StatsPlaceholder />}
                        {activeTab === 'assets' && <AssetsPage />}
                    </div>
                </div>
            </div>
        </div>
    );
}
