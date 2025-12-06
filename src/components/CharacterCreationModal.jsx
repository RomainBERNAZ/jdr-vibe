import React, { useState } from 'react';
import { User, Shield, Sword, Crown, Scroll } from 'lucide-react';

export default function CharacterCreationModal({ onCreate }) {
    const [formData, setFormData] = useState({
        name: '',
        race: 'Humain',
        class: 'Guerrier',
        background: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        // Création de la fiche de base
        const newCharacter = {
            name: formData.name,
            race: formData.race,
            class: formData.class,
            level: 1,
            hp: { current: 10, max: 10 }, // Valeurs par défaut, l'IA ajustera
            gold: 10,
            inventory: ['Rations (1 jour)', 'Outre d\'eau'],
            stats: { 
                force: 10, 
                dexterite: 10, 
                intelligence: 10, 
                charisme: 10 
            },
            background: formData.background
        };
        onCreate(newCharacter);
    };

    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-lg w-full p-6 md:p-8 shadow-2xl relative overflow-hidden my-auto">
                {/* Effet de fond */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                
                <h2 className="text-2xl md:text-3xl font-serif font-bold text-center mb-2 text-indigo-100">Nouveau Héros</h2>
                <p className="text-zinc-400 text-center mb-6 md:mb-8 text-sm">Avant d'entrer dans l'Aether, qui incarnez-vous ?</p>

                <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6 relative z-10">
                    <div>
                        <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-2 font-bold">Nom du Personnage</label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 w-5 h-5 text-zinc-500" />
                            <input 
                                type="text" 
                                required
                                value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                                className="w-full bg-black/50 border border-zinc-700 rounded-lg py-2.5 pl-10 pr-4 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-zinc-200 placeholder-zinc-600"
                                placeholder="Ex: Valerius le Brave"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-2 font-bold">Race</label>
                            <div className="relative">
                                <Crown className="absolute left-3 top-3 w-5 h-5 text-zinc-500" />
                                <select 
                                    value={formData.race}
                                    onChange={e => setFormData({...formData, race: e.target.value})}
                                    className="w-full bg-black/50 border border-zinc-700 rounded-lg py-2.5 pl-10 pr-4 focus:border-indigo-500 outline-none appearance-none text-zinc-200 cursor-pointer"
                                >
                                    <option>Humain</option>
                                    <option>Elfe</option>
                                    <option>Nain</option>
                                    <option>Halfelin</option>
                                    <option>Orc</option>
                                    <option>Tieffelin</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-2 font-bold">Classe</label>
                            <div className="relative">
                                <Sword className="absolute left-3 top-3 w-5 h-5 text-zinc-500" />
                                <select 
                                    value={formData.class}
                                    onChange={e => setFormData({...formData, class: e.target.value})}
                                    className="w-full bg-black/50 border border-zinc-700 rounded-lg py-2.5 pl-10 pr-4 focus:border-indigo-500 outline-none appearance-none text-zinc-200 cursor-pointer"
                                >
                                    <option>Guerrier</option>
                                    <option>Mage</option>
                                    <option>Voleur</option>
                                    <option>Clerc</option>
                                    <option>Rôdeur</option>
                                    <option>Barde</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-2 font-bold">Court Historique (Optionnel)</label>
                        <div className="relative">
                            <Scroll className="absolute left-3 top-3 w-5 h-5 text-zinc-500" />
                            <textarea 
                                value={formData.background}
                                onChange={e => setFormData({...formData, background: e.target.value})}
                                className="w-full bg-black/50 border border-zinc-700 rounded-lg py-2.5 pl-10 pr-4 focus:border-indigo-500 outline-none min-h-[80px] text-zinc-200 placeholder-zinc-600 resize-none"
                                placeholder="D'où venez-vous ? Que cherchez-vous ?"
                            />
                        </div>
                    </div>

                    <button 
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg transition-all transform hover:scale-[1.02] shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2"
                    >
                        <Shield className="w-5 h-5" />
                        Commencer l'Aventure
                    </button>
                </form>
            </div>
        </div>
    );
}

