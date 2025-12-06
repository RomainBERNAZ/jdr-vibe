import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, UserPlus, Trash2, Play, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { campaignApi } from '../services/api';

export default function CampaignEditPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { token } = useAuth();
    const [campaign, setCampaign] = useState(null);
    const [loading, setLoading] = useState(true);
    const [newPlayerEmail, setNewPlayerEmail] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        system: '',
        description: ''
    });

    useEffect(() => {
        loadCampaign();
    }, [id, token]);

    const loadCampaign = async () => {
        try {
            const data = await campaignApi.get(token, id);
            setCampaign(data);
            setFormData({
                name: data.name,
                system: data.system,
                description: data.description || ''
            });
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            await campaignApi.update(token, id, formData);
            // Show success feedback?
            alert('Campagne mise à jour');
        } catch (err) {
            console.error(err);
        }
    };

    const handleAddPlayer = async (e) => {
        e.preventDefault();
        if (!newPlayerEmail) return;
        try {
            const updatedPlayers = await campaignApi.addPlayer(token, id, newPlayerEmail);
            setCampaign(prev => ({ ...prev, players: updatedPlayers }));
            setNewPlayerEmail('');
        } catch (err) {
            alert(err.error || "Impossible d'ajouter le joueur");
        }
    };

    const handleStartCampaign = async () => {
        if (!confirm("Voulez-vous vraiment lancer la campagne ? Vous ne pourrez plus ajouter de joueurs simplement.")) return;
        try {
            const updated = await campaignApi.update(token, id, { status: 'active' });
            setCampaign(prev => ({ ...prev, status: updated.status }));
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) return <div className="p-10 text-center">Chargement...</div>;
    if (!campaign) return <div className="p-10 text-center">Campagne introuvable</div>;

    const isStarted = campaign.status === 'active' || campaign.status === 'completed';

    return (
        <div className="max-w-4xl mx-auto p-6">
            <button onClick={() => navigate('/')} className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6">
                <ArrowLeft className="w-4 h-4" /> Retour au tableau de bord
            </button>

            <header className="mb-8 flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Gestion de Campagne</h1>
                    <span className={`px-3 py-1 rounded-full text-sm ${isStarted ? 'bg-green-900/30 text-green-400 border border-green-800' : 'bg-yellow-900/30 text-yellow-400 border border-yellow-800'}`}>
                        {campaign.status === 'active' ? 'En cours' : 'Préparation'}
                    </span>
                </div>
                {!isStarted && (
                    <button 
                        onClick={handleStartCampaign}
                        className="bg-indigo-600 hover:bg-indigo-500 px-6 py-2 rounded-lg font-bold flex items-center gap-2"
                    >
                        <Play className="w-4 h-4" /> Lancer l'aventure
                    </button>
                )}
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-6">
                    <section className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Save className="w-5 h-5 text-zinc-400" /> Informations
                        </h2>
                        <form onSubmit={handleUpdate} className="space-y-4">
                            <div>
                                <label className="block text-sm text-zinc-400 mb-1">Nom de la campagne</label>
                                <input 
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2 focus:border-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-zinc-400 mb-1">Système de jeu</label>
                                <input 
                                    value={formData.system}
                                    onChange={e => setFormData({...formData, system: e.target.value})}
                                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2 focus:border-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-zinc-400 mb-1">Description / Synopsis</label>
                                <textarea 
                                    value={formData.description}
                                    onChange={e => setFormData({...formData, description: e.target.value})}
                                    rows={4}
                                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2 focus:border-indigo-500 outline-none resize-none"
                                />
                            </div>
                            <button className="w-full bg-zinc-800 hover:bg-zinc-700 py-2 rounded-lg font-medium transition-colors">
                                Sauvegarder les modifications
                            </button>
                        </form>
                    </section>
                </div>

                <div className="space-y-6">
                    <section className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <UserPlus className="w-5 h-5 text-zinc-400" /> Joueurs
                        </h2>
                        
                        {!isStarted ? (
                            <form onSubmit={handleAddPlayer} className="mb-6">
                                <div className="flex gap-2">
                                    <input 
                                        type="email"
                                        placeholder="Email du joueur"
                                        value={newPlayerEmail}
                                        onChange={e => setNewPlayerEmail(e.target.value)}
                                        className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                                    />
                                    <button className="bg-zinc-800 hover:bg-zinc-700 px-3 rounded-lg">
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                                <p className="text-xs text-zinc-500 mt-2">Invitez des joueurs par leur email enregistré.</p>
                            </form>
                        ) : (
                            <p className="text-sm text-zinc-500 mb-4 italic">La campagne a commencé, le recrutement est fermé.</p>
                        )}

                        <div className="space-y-3">
                            {campaign.players && campaign.players.length > 0 ? (
                                campaign.players.map(player => (
                                    <div key={player.id} className="flex items-center justify-between bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                                        <div className="overflow-hidden">
                                            <p className="font-medium truncate">{player.email}</p>
                                            <p className="text-xs text-zinc-500">{player.character_name || "Sans personnage"}</p>
                                        </div>
                                        {/* Admin actions could go here */}
                                    </div>
                                ))
                            ) : (
                                <p className="text-zinc-500 text-center py-4">Aucun joueur assigné</p>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}

