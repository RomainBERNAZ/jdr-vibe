import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmModal({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title = 'Confirmer la suppression',
    message = 'Êtes-vous sûr de vouloir effectuer cette action ?',
    confirmText = 'Supprimer',
    cancelText = 'Annuler',
    type = 'danger' // 'danger', 'warning', 'info'
}) {
    if (!isOpen) return null;

    const colors = {
        danger: {
            button: 'bg-red-600 hover:bg-red-700',
            icon: 'text-red-400',
            border: 'border-red-700'
        },
        warning: {
            button: 'bg-yellow-600 hover:bg-yellow-700',
            icon: 'text-yellow-400',
            border: 'border-yellow-700'
        },
        info: {
            button: 'bg-blue-600 hover:bg-blue-700',
            icon: 'text-blue-400',
            border: 'border-blue-700'
        }
    };

    const colorScheme = colors[type] || colors.danger;

    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className={`bg-zinc-900 border ${colorScheme.border} rounded-xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200`}>
                {/* Bouton fermer */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Icône */}
                <div className="flex items-center gap-4 mb-4">
                    <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                        type === 'danger' ? 'bg-red-900/30' : 
                        type === 'warning' ? 'bg-yellow-900/30' : 
                        'bg-blue-900/30'
                    }`}>
                        <AlertTriangle className={`w-6 h-6 ${colorScheme.icon}`} />
                    </div>
                    <h3 className="text-xl font-bold text-white">{title}</h3>
                </div>

                {/* Message */}
                <div className="mb-6">
                    <p className="text-zinc-300 whitespace-pre-line">{message}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={handleConfirm}
                        className={`flex-1 ${colorScheme.button} text-white px-4 py-2.5 rounded-lg font-bold transition-colors`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}

