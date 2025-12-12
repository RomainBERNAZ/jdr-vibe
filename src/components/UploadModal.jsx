import React, { useState } from 'react';
import { Upload, CheckCircle, XCircle, Loader, Image as ImageIcon, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function UploadModal({ isOpen, onClose, onUploadSuccess }) {
    const { token } = useAuth();
    const [selectedFile, setSelectedFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Vérifier le type de fichier
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
            if (!allowedTypes.includes(file.type)) {
                setError('Type de fichier non autorisé. Utilisez JPEG, PNG, GIF ou WEBP.');
                return;
            }

            // Vérifier la taille (10MB max)
            if (file.size > 10 * 1024 * 1024) {
                setError('Fichier trop volumineux. Maximum 10MB.');
                return;
            }

            setSelectedFile(file);
            setError(null);
            setResult(null);

            // Créer une preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile || !token) {
            setError('Veuillez sélectionner un fichier et être connecté.');
            return;
        }

        setUploading(true);
        setError(null);
        setResult(null);

        try {
            const formData = new FormData();
            formData.append('image', selectedFile);

            const response = await fetch('/api/upload/image', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erreur lors de l\'upload');
            }

            setResult(data);
            console.log('Upload réussi:', data);
            
            // Notifier le parent du succès
            if (onUploadSuccess) {
                onUploadSuccess(data);
            }
        } catch (err) {
            console.error('Erreur upload:', err);
            setError(err.message || 'Erreur lors de l\'upload de l\'image');
        } finally {
            setUploading(false);
        }
    };

    const handleReset = () => {
        setSelectedFile(null);
        setPreview(null);
        setResult(null);
        setError(null);
    };

    const handleClose = () => {
        handleReset();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 ease-out duration-200">
                {/* Header */}
                <div className="p-6 border-b border-zinc-800 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <ImageIcon className="w-6 h-6 text-indigo-500" />
                        <div>
                            <h2 className="text-xl font-bold text-white">Upload d'image</h2>
                            <p className="text-sm text-zinc-400">Téléchargez une image vers Cloudflare R2</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
                        title="Fermer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-700">
                    {/* Zone de sélection de fichier */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-zinc-300 mb-2">
                            Sélectionner une image (JPEG, PNG, GIF, WEBP - Max 10MB)
                        </label>
                        <div className="border-2 border-dashed border-zinc-700 rounded-lg p-8 text-center hover:border-indigo-500 transition-colors">
                            <input
                                type="file"
                                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                                onChange={handleFileSelect}
                                className="hidden"
                                id="file-input"
                                disabled={uploading}
                            />
                            <label
                                htmlFor="file-input"
                                className="cursor-pointer flex flex-col items-center gap-4"
                            >
                                {preview ? (
                                    <div className="relative">
                                        <img
                                            src={preview}
                                            alt="Preview"
                                            className="max-h-64 rounded-lg border border-zinc-700"
                                        />
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleReset();
                                            }}
                                            className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1"
                                        >
                                            <XCircle className="w-5 h-5" />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <Upload className="w-12 h-12 text-zinc-500" />
                                        <span className="text-zinc-400">
                                            Cliquez pour sélectionner ou glissez-déposez une image
                                        </span>
                                    </>
                                )}
                            </label>
                        </div>
                        {selectedFile && (
                            <div className="mt-4 text-sm text-zinc-400">
                                <p><strong>Fichier:</strong> {selectedFile.name}</p>
                                <p><strong>Taille:</strong> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                <p><strong>Type:</strong> {selectedFile.type}</p>
                            </div>
                        )}
                    </div>

                    {/* Bouton d'upload */}
                    {selectedFile && (
                        <div className="mb-6">
                            <button
                                onClick={handleUpload}
                                disabled={uploading}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2"
                            >
                                {uploading ? (
                                    <>
                                        <Loader className="w-5 h-5 animate-spin" />
                                        Upload en cours...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-5 h-5" />
                                        Uploader vers R2
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Résultat */}
                    {result && (
                        <div className="mb-6 p-4 bg-green-900/20 border border-green-700 rounded-lg">
                            <div className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <h3 className="font-bold text-green-400 mb-2">Upload réussi !</h3>
                                    <div className="text-sm text-zinc-300 space-y-1">
                                        <p><strong>Message:</strong> {result.message}</p>
                                        <p><strong>URL R2:</strong> <a href={result.r2Url} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline break-all">{result.r2Url}</a></p>
                                        <p><strong>Clé R2:</strong> <span className="font-mono text-xs">{result.r2Key}</span></p>
                                        <p><strong>Taille:</strong> {result.size}</p>
                                        <p><strong>Type MIME:</strong> {result.mimeType}</p>
                                        {result.signedUrl && (
                                            <div className="mt-3">
                                                <p className="mb-2"><strong>Aperçu:</strong></p>
                                                <img
                                                    src={result.signedUrl}
                                                    alt="Preview"
                                                    className="max-w-full rounded-lg border border-zinc-700"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Erreur */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded-lg">
                            <div className="flex items-start gap-3">
                                <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <h3 className="font-bold text-red-400 mb-1">Erreur</h3>
                                    <p className="text-sm text-red-300">{error}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-zinc-800 flex justify-end gap-3 shrink-0">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                    >
                        Fermer
                    </button>
                </div>
            </div>
        </div>
    );
}

