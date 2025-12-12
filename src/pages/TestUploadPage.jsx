import React, { useState } from 'react';
import { Upload, CheckCircle, XCircle, Loader, Image as ImageIcon, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function TestUploadPage() {
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

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-4">
                    <button
                        onClick={() => navigate('/assets')}
                        className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
                        title="Retour aux assets"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 md:p-8 shadow-2xl">
                    <h1 className="text-3xl font-bold mb-2 text-indigo-100 flex items-center gap-3">
                        <ImageIcon className="w-8 h-8" />
                        Test Upload Cloudflare R2
                    </h1>
                    <p className="text-zinc-400 mb-6">
                        Testez l'upload d'images vers votre bucket Cloudflare R2
                    </p>

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
                                <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <h3 className="font-bold text-green-400 mb-2">Upload réussi !</h3>
                                    <div className="space-y-2 text-sm">
                                        <p><strong>Message:</strong> {result.message}</p>
                                        <p><strong>URL R2:</strong></p>
                                        <a
                                            href={result.url || result.original_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-indigo-400 hover:text-indigo-300 break-all underline"
                                        >
                                            {result.url || result.original_url}
                                        </a>
                                        {result.original_url && result.original_url !== result.url && (
                                            <p className="text-xs text-zinc-500 mt-1">
                                                URL originale: <span className="break-all">{result.original_url}</span>
                                            </p>
                                        )}
                                        {result.r2Key && (
                                            <p><strong>Clé R2:</strong> <code className="bg-zinc-800 px-2 py-1 rounded">{result.r2Key}</code></p>
                                        )}
                                        <p><strong>Taille:</strong> {(result.size / 1024).toFixed(2)} KB</p>
                                        <p><strong>Type MIME:</strong> {result.mimetype}</p>
                                    </div>
                                    {(result.url || result.original_url) && (
                                        <div className="mt-4">
                                            <p className="text-sm text-zinc-400 mb-2">Aperçu:</p>
                                            <img
                                                src={result.url || result.original_url}
                                                alt="Uploaded"
                                                className="max-w-full max-h-64 rounded-lg border border-zinc-700"
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                    const errorMsg = document.createElement('p');
                                                    errorMsg.className = 'text-red-400 text-sm';
                                                    errorMsg.textContent = 'Impossible de charger l\'image. L\'URL signée a peut-être expiré.';
                                                    e.target.parentElement.appendChild(errorMsg);
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Erreur */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded-lg">
                            <div className="flex items-start gap-3">
                                <XCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="font-bold text-red-400 mb-1">Erreur</h3>
                                    <p className="text-red-300 text-sm">{error}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Info R2 */}
                    <div className="mt-8 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                        <h3 className="font-bold text-zinc-300 mb-2">ℹ️ Informations</h3>
                        <ul className="text-sm text-zinc-400 space-y-1 list-disc list-inside">
                            <li>Les images sont uploadées vers Cloudflare R2</li>
                            <li>Format de stockage: <code className="bg-zinc-900 px-1 rounded">images/{'{userId}'}/{'{timestamp}'}-{'{filename}'}</code></li>
                            <li>Si R2 n'est pas configuré, le fichier sera stocké localement temporairement</li>
                            <li>Vérifiez votre configuration dans le fichier <code className="bg-zinc-900 px-1 rounded">.env</code></li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}

