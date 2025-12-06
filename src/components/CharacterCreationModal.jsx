import React, { useState, useEffect } from 'react';
import { User, Shield, Sword, Crown, Scroll } from 'lucide-react';

// D&D 5e Standard Stats & Modifiers
const RACES = {
    'Humain': { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 },
    'Elfe': { dex: 2 },
    'Nain': { con: 2 },
    'Halfelin': { dex: 2 },
    'Orc': { str: 2, con: 1 },
    'Tieffelin': { cha: 2, int: 1 }
};

const CLASSES = {
    'Guerrier': { hp: 10, main: 'str' },
    'Mage': { hp: 6, main: 'int' },
    'Voleur': { hp: 8, main: 'dex' },
    'Clerc': { hp: 8, main: 'wis' },
    'Rôdeur': { hp: 10, main: 'dex' },
    'Barde': { hp: 8, main: 'cha' },
    'Paladin': { hp: 10, main: 'str' },
    'Barbare': { hp: 12, main: 'str' }
};

export default function CharacterCreationModal({ onCreate, onCancel, initialData }) {
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        race: initialData?.race || 'Humain',
        class: initialData?.class || 'Guerrier',
        background: initialData?.background || ''
    });

    // Helper to calculate derived stats
    const calculateStats = (race, charClass) => {
        // Base Stats (Standard Array variant or simple baseline)
        let stats = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
        
        // Apply Racial Bonuses
        const bonuses = RACES[race] || {};
        Object.keys(bonuses).forEach(stat => {
            stats[stat] += bonuses[stat];
        });

        // Apply Class 'Focus' (Simple boost to main stat for gameplay feel)
        // NOTE: This is homebrew-ish. In standard 5e, class doesn't give stats at level 1.
        // We keep it for gameplay flavour or remove it if we want strict 5e.
        const classInfo = CLASSES[charClass] || CLASSES['Guerrier'];
        if (classInfo.main) stats[classInfo.main] += 2;

        // Calculate HP
        // Con Mod = floor((Con - 10) / 2)
        const conMod = Math.floor((stats.con - 10) / 2);
        const maxHp = (classInfo.hp || 8) + conMod;

        return { stats, maxHp };
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Preserve existing data if editing, but recalculate derived stats if race/class changed
        // NOTE: For a real RPG, you might not want to auto-reset stats on edit if they were custom rolled. 
        // But here we stick to the base logic for simplicity or if it's a fresh create.
        // If editing, we might want to keep current HP/Gold/Inventory unless explicitly reset.
        // For this MVP, we'll just update the core fields and recalculate base stats if it's a new char, 
        // OR purely update name/race/class/background if editing, keeping the rest?
        
        let charData = {
            name: formData.name,
            race: formData.race,
            class: formData.class,
            background: formData.background
        };

        if (!initialData) {
            // Fresh Creation Logic
            const { stats, maxHp } = calculateStats(formData.race, formData.class);
            charData = {
                ...charData,
                level: 1,
                hp: { current: maxHp, max: maxHp },
                hp_current: maxHp,
                hp_max: maxHp,
                gold: 15,
                inventory: ['Rations (1 jour)', 'Outre d\'eau', 'Sac à dos'],
                stats: stats
            };
             // Add class starting gear
            if (formData.class === 'Guerrier') charData.inventory.push('Épée longue', 'Cotte de mailles');
            if (formData.class === 'Mage') charData.inventory.push('Grimoire', 'Bâton');
            if (formData.class === 'Voleur') charData.inventory.push('Dagues (x2)', 'Outils de voleur');
            if (formData.class === 'Clerc') charData.inventory.push('Masse d\'armes', 'Symbole sacré');
        } else {
            // Editing Logic: Update derived stats if race/class changed? 
            // Let's assume for now we just update the bio info to avoid resetting HP/Inventory accidentally.
            // If user wants to re-roll stats, they should delete and recreate.
            charData = { ...initialData, ...charData };
        }
        
        onCreate(charData);
    };

    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-lg w-full p-6 md:p-8 shadow-2xl relative overflow-hidden my-auto">
                {/* Effet de fond */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                
                <h2 className="text-2xl md:text-3xl font-serif font-bold text-center mb-2 text-indigo-100">
                    {initialData ? 'Modifier le Héros' : 'Nouveau Héros'}
                </h2>
                <p className="text-zinc-400 text-center mb-6 md:mb-8 text-sm">
                    {initialData ? 'Mettez à jour votre légende.' : "Avant d'entrer dans l'Aether, qui incarnez-vous ?"}
                </p>

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
                                    {Object.keys(RACES).map(r => <option key={r}>{r}</option>)}
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
                                    {Object.keys(CLASSES).map(c => <option key={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Preview des stats calculées dynamiquement pour info */}
                    <div className="bg-black/30 p-3 rounded border border-zinc-800 text-xs text-zinc-400 flex justify-between items-center">
                        <span>PV Initiaux: <strong className="text-white">{CLASSES[formData.class]?.hp || 8}</strong> (+ CON)</span>
                        <span>Bonus Race: <strong className="text-white">{Object.keys(RACES[formData.race] || {}).join(', ').toUpperCase()}</strong></span>
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

                    <div className="flex gap-3">
                        {onCancel && (
                            <button 
                                type="button"
                                onClick={onCancel}
                                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold py-3 rounded-lg transition-all"
                            >
                                Annuler
                            </button>
                        )}
                        <button 
                            type="submit"
                            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg transition-all transform hover:scale-[1.02] shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2"
                        >
                            <Shield className="w-5 h-5" />
                            {initialData ? 'Sauvegarder' : 'Commencer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
