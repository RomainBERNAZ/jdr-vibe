import React from 'react';
import { User, Plus, Sword, Shield, Crown } from 'lucide-react';

export default function CharacterSelectionModal({ characters, onSelect, onCreateNew }) {
    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-4xl w-full p-6 md:p-8 shadow-2xl relative overflow-hidden my-auto">
                {/* Effet de fond */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                
                <div className="relative z-10">
                    <h2 className="text-2xl md:text-3xl font-serif font-bold text-center mb-2 text-indigo-100">
                        Choisissez votre Héros
                    </h2>
                    <p className="text-zinc-400 text-center mb-6 md:mb-8 text-sm">
                        Sélectionnez un personnage existant ou créez-en un nouveau pour commencer l'aventure.
                    </p>

                    {characters.length === 0 ? (
                        <div className="text-center py-12">
                            <User className="w-16 h-16 mx-auto mb-4 text-zinc-700" />
                            <p className="text-zinc-500 mb-6">Aucun personnage disponible</p>
                            <button
                                onClick={onCreateNew}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-lg transition-all transform hover:scale-[1.02] shadow-lg shadow-indigo-900/20 flex items-center gap-2 mx-auto"
                            >
                                <Plus className="w-5 h-5" />
                                Créer un Personnage
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                                {characters.map(char => (
                                    <button
                                        key={char.id}
                                        onClick={() => onSelect(char)}
                                        className="bg-zinc-800/50 border border-zinc-700 p-4 rounded-lg hover:border-indigo-500 hover:bg-zinc-800 transition-all text-left group relative overflow-hidden"
                                    >
                                        {/* Effet hover */}
                                        <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/5 transition-colors"></div>
                                        
                                        <div className="relative z-10">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex-1">
                                                    <h3 className="font-bold text-lg text-white mb-1">{char.name}</h3>
                                                    <p className="text-indigo-400 text-sm flex items-center gap-1">
                                                        <Crown className="w-3 h-3" />
                                                        {char.race}
                                                    </p>
                                                    <p className="text-zinc-500 text-sm flex items-center gap-1 mt-1">
                                                        <Sword className="w-3 h-3" />
                                                        {char.class}
                                                    </p>
                                                </div>
                                                <span className="text-xs bg-indigo-600/20 text-indigo-400 px-2 py-1 rounded border border-indigo-600/30">
                                                    Niv. {char.level || 1}
                                                </span>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-2 mb-3">
                                                <div className="bg-zinc-950/50 p-2 rounded text-center">
                                                    <span className="block text-xs text-zinc-500">PV</span>
                                                    <span className="text-red-400 font-bold text-sm">
                                                        {char.hp_current || char.hp?.current || 10} / {char.hp_max || char.hp?.max || 10}
                                                    </span>
                                                </div>
                                                <div className="bg-zinc-950/50 p-2 rounded text-center">
                                                    <span className="block text-xs text-zinc-500">Or</span>
                                                    <span className="text-amber-400 font-bold text-sm">{char.gold || 0}</span>
                                                </div>
                                            </div>
                                            
                                            {char.backstory && (
                                                <p className="text-xs text-zinc-500 line-clamp-2">
                                                    {char.backstory}
                                                </p>
                                            )}
                                        </div>
                                        
                                        {/* Indicateur de sélection */}
                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Shield className="w-5 h-5 text-indigo-400" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                            
                            <div className="flex justify-center pt-4 border-t border-zinc-800">
                                <button
                                    onClick={onCreateNew}
                                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold px-6 py-3 rounded-lg transition-all flex items-center gap-2"
                                >
                                    <Plus className="w-5 h-5" />
                                    Créer un Nouveau Personnage
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

