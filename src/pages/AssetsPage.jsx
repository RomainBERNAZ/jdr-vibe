import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Music, Video, File, Trash2, Edit, Search, Filter, X, Tag, Upload, BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { assetApi, campaignApi } from '../services/api';
import { useNavigate } from 'react-router-dom';
import ConfirmModal from '../components/ConfirmModal';
import UploadModal from '../components/UploadModal';

const FileTypeIcon = ({ type }) => {
    const iconClass = "w-5 h-5";
    switch (type) {
        case 'image':
            return <ImageIcon className={iconClass} />;
        case 'audio':
            return <Music className={iconClass} />;
        case 'video':
            return <Video className={iconClass} />;
        default:
            return <File className={iconClass} />;
    }
};

const FileTypeBadge = ({ type }) => {
    const colors = {
        image: 'bg-blue-900/30 text-blue-400 border-blue-700',
        audio: 'bg-purple-900/30 text-purple-400 border-purple-700',
        video: 'bg-red-900/30 text-red-400 border-red-700',
        other: 'bg-zinc-800 text-zinc-400 border-zinc-700'
    };
    
    return (
        <span className={`px-2 py-1 rounded text-xs border ${colors[type] || colors.other}`}>
            {type}
        </span>
    );
};

export default function AssetsPage() {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterCampaign, setFilterCampaign] = useState('');
    const [editingAsset, setEditingAsset] = useState(null);
    const [editForm, setEditForm] = useState({ title: '', description: '', tags: [], campaign_id: null, chapter_id: null });
    const [deleteConfirm, setDeleteConfirm] = useState(null); // { id, name }
    const [campaigns, setCampaigns] = useState([]);
    const [chapters, setChapters] = useState([]);
    const [showUploadModal, setShowUploadModal] = useState(false);

    useEffect(() => {
        loadAssets();
        loadCampaigns();
    }, [token, filterType, filterCampaign]);

    useEffect(() => {
        if (filterCampaign) {
            loadChapters(filterCampaign);
        } else {
            setChapters([]);
        }
    }, [filterCampaign, token]);

    const loadAssets = async () => {
        try {
            setLoading(true);
            const filters = {};
            if (filterType) filters.fileType = filterType;
            if (filterCampaign) filters.campaignId = filterCampaign;
            const data = await assetApi.list(token, filters);
            setAssets(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Erreur chargement assets:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadCampaigns = async () => {
        try {
            const data = await campaignApi.list(token);
            setCampaigns(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Erreur chargement campagnes:', error);
        }
    };

    const loadChapters = async (campaignId) => {
        try {
            const campaign = await campaignApi.get(token, campaignId);
            setChapters(Array.isArray(campaign.chapters) ? campaign.chapters : []);
        } catch (error) {
            console.error('Erreur chargement chapitres:', error);
            setChapters([]);
        }
    };

    const handleDeleteClick = (id) => {
        const asset = assets.find(a => a.id === id);
        const assetName = asset?.title || asset?.filename || 'cet asset';
        setDeleteConfirm({ id, name: assetName });
    };

    const handleDeleteConfirm = async () => {
        if (!deleteConfirm) return;
        
        try {
            await assetApi.delete(token, deleteConfirm.id);
            setAssets(assets.filter(a => a.id !== deleteConfirm.id));
            setDeleteConfirm(null);
        } catch (error) {
            console.error('Erreur suppression:', error);
            const errorMessage = error.error || error.message || 'Erreur lors de la suppression';
            alert(`Erreur lors de la suppression : ${errorMessage}`);
            setDeleteConfirm(null);
        }
    };

    const handleEdit = async (asset) => {
        setEditingAsset(asset);
        setEditForm({
            title: asset.title || '',
            description: asset.description || '',
            tags: asset.tags || [],
            campaign_id: asset.campaign_id || null,
            chapter_id: asset.chapter_id || null
        });
        
        // Charger les chapitres si une campagne est associée
        if (asset.campaign_id) {
            await loadChapters(asset.campaign_id);
        } else {
            setChapters([]);
        }
    };

    const handleSaveEdit = async () => {
        try {
            const updated = await assetApi.update(token, editingAsset.id, {
                title: editForm.title,
                description: editForm.description,
                tags: editForm.tags,
                campaign_id: editForm.campaign_id || null,
                chapter_id: editForm.chapter_id || null
            });
            setAssets(assets.map(a => a.id === updated.id ? updated : a));
            setEditingAsset(null);
            setChapters([]);
        } catch (error) {
            console.error('Erreur mise à jour:', error);
            alert('Erreur lors de la mise à jour');
        }
    };

    const handleCampaignChange = async (campaignId) => {
        const newCampaignId = campaignId === '' ? null : parseInt(campaignId);
        setEditForm({
            ...editForm,
            campaign_id: newCampaignId,
            chapter_id: null // Réinitialiser le chapitre si on change de campagne
        });
        
        if (newCampaignId) {
            await loadChapters(newCampaignId);
        } else {
            setChapters([]);
        }
    };

    const handleAddTag = (e) => {
        if (e.key === 'Enter' && e.target.value.trim()) {
            e.preventDefault();
            const newTag = e.target.value.trim();
            if (!editForm.tags.includes(newTag)) {
                setEditForm({
                    ...editForm,
                    tags: [...editForm.tags, newTag]
                });
            }
            e.target.value = '';
        }
    };

    const handleRemoveTag = (tagToRemove) => {
        setEditForm({
            ...editForm,
            tags: editForm.tags.filter(t => t !== tagToRemove)
        });
    };

    const filteredAssets = assets.filter(asset => {
        const matchesSearch = !searchTerm || 
            asset.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (asset.title && asset.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (asset.description && asset.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (asset.tags && asset.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())));
        
        return matchesSearch;
    });

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-white">Assets</h2>
                    <p className="text-zinc-400">Gérez vos fichiers uploadés sur Cloudflare R2</p>
                </div>
                <button
                    onClick={() => setShowUploadModal(true)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"
                >
                    <Upload className="w-5 h-5" />
                    Uploader un asset
                </button>
            </div>

            {/* Filtres et recherche */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-3 w-5 h-5 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Rechercher par nom, titre, description ou tag..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 px-10 py-2 rounded-lg outline-none focus:border-indigo-500 text-white placeholder-zinc-500"
                    />
                </div>
                <div className="flex gap-2">
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="bg-zinc-900 border border-zinc-700 px-4 py-2 rounded-lg outline-none focus:border-indigo-500 text-white"
                    >
                        <option value="">Tous les types</option>
                        <option value="image">Images</option>
                        <option value="audio">Audio</option>
                        <option value="video">Vidéos</option>
                        <option value="other">Autres</option>
                    </select>
                    <select
                        value={filterCampaign}
                        onChange={(e) => setFilterCampaign(e.target.value)}
                        className="bg-zinc-900 border border-zinc-700 px-4 py-2 rounded-lg outline-none focus:border-indigo-500 text-white"
                    >
                        <option value="">Toutes les campagnes</option>
                        {campaigns.map(camp => (
                            <option key={camp.id} value={camp.id}>{camp.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Modal d'édition */}
            {editingAsset && (
                <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-2xl w-full p-6 shadow-2xl">
                        <h3 className="text-xl font-bold mb-4 text-white">Modifier l'asset</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-2">Titre</label>
                                <input
                                    type="text"
                                    value={editForm.title}
                                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                    className="w-full bg-zinc-800 border border-zinc-700 px-4 py-2 rounded-lg outline-none focus:border-indigo-500 text-white"
                                    placeholder="Titre optionnel"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-2">Description</label>
                                <textarea
                                    value={editForm.description}
                                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                    className="w-full bg-zinc-800 border border-zinc-700 px-4 py-2 rounded-lg outline-none focus:border-indigo-500 text-white min-h-[100px]"
                                    placeholder="Description (utile pour OpenAI)"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-2">Tags</label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {editForm.tags.map((tag, idx) => (
                                        <span
                                            key={idx}
                                            className="bg-indigo-900/30 text-indigo-300 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                                        >
                                            {tag}
                                            <button
                                                onClick={() => handleRemoveTag(tag)}
                                                className="hover:text-red-400"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                                <input
                                    type="text"
                                    onKeyDown={handleAddTag}
                                    placeholder="Ajouter un tag (Entrée pour valider)"
                                    className="w-full bg-zinc-800 border border-zinc-700 px-4 py-2 rounded-lg outline-none focus:border-indigo-500 text-white"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-300 mb-2">Campagne</label>
                                    <select
                                        value={editForm.campaign_id || ''}
                                        onChange={(e) => handleCampaignChange(e.target.value)}
                                        className="w-full bg-zinc-800 border border-zinc-700 px-4 py-2 rounded-lg outline-none focus:border-indigo-500 text-white"
                                    >
                                        <option value="">Aucune campagne</option>
                                        {campaigns.map(camp => (
                                            <option key={camp.id} value={camp.id}>{camp.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-zinc-300 mb-2">Chapitre</label>
                                    <select
                                        value={editForm.chapter_id || ''}
                                        onChange={(e) => setEditForm({ ...editForm, chapter_id: e.target.value === '' ? null : parseInt(e.target.value) })}
                                        disabled={!editForm.campaign_id}
                                        className="w-full bg-zinc-800 border border-zinc-700 px-4 py-2 rounded-lg outline-none focus:border-indigo-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <option value="">Aucun chapitre</option>
                                        {chapters.map(chapter => (
                                            <option key={chapter.id} value={chapter.id}>{chapter.title}</option>
                                        ))}
                                    </select>
                                    {!editForm.campaign_id && (
                                        <p className="text-xs text-zinc-500 mt-1">Sélectionnez d'abord une campagne</p>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setEditingAsset(null)}
                                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-bold"
                            >
                                Sauvegarder
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Liste des assets */}
            {loading ? (
                <div className="text-center py-12 text-zinc-500">Chargement...</div>
            ) : filteredAssets.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 border-2 border-dashed border-zinc-800 rounded-xl">
                    <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-medium">Aucun asset trouvé</p>
                    <p className="text-sm">Commencez par uploader un fichier</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredAssets.map(asset => (
                        <div
                            key={asset.id}
                            className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden hover:border-indigo-500/50 transition-all group"
                        >
                            {/* Image preview */}
                            <div className="aspect-square bg-zinc-950 relative overflow-hidden">
                                {asset.file_type === 'image' ? (
                                    <img
                                        src={asset.signed_url || asset.url}
                                        alt={asset.title || asset.filename}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            e.target.parentElement.innerHTML = '<div class="flex items-center justify-center h-full text-zinc-600"><ImageIcon class="w-12 h-12" /></div>';
                                        }}
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-zinc-600">
                                        <FileTypeIcon type={asset.file_type} />
                                    </div>
                                )}
                                
                                {/* Actions overlay */}
                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleEdit(asset)}
                                        className="p-2 bg-zinc-900/90 hover:bg-indigo-600 rounded text-zinc-400 hover:text-white transition-colors"
                                        title="Modifier"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteClick(asset.id)}
                                        className="p-2 bg-zinc-900/90 hover:bg-red-600 rounded text-zinc-400 hover:text-white transition-colors"
                                        title="Supprimer"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            
                            {/* Infos */}
                            <div className="p-4">
                                <div className="flex items-start justify-between mb-2">
                                    <h3 className="font-bold text-white truncate flex-1" title={asset.title || asset.filename}>
                                        {asset.title || asset.filename}
                                    </h3>
                                    <FileTypeBadge type={asset.file_type} />
                                </div>
                                
                                {asset.description && (
                                    <p className="text-sm text-zinc-400 line-clamp-2 mb-2">{asset.description}</p>
                                )}
                                
                                {asset.tags && asset.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-2">
                                        {asset.tags.slice(0, 3).map((tag, idx) => (
                                            <span
                                                key={idx}
                                                className="bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded text-xs"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                        {asset.tags.length > 3 && (
                                            <span className="text-zinc-500 text-xs">+{asset.tags.length - 3}</span>
                                        )}
                                    </div>
                                )}
                                
                                <div className="flex items-center justify-between text-xs text-zinc-500 mt-2">
                                    <span>{formatFileSize(asset.file_size)}</span>
                                    <span>{new Date(asset.created_at).toLocaleDateString()}</span>
                                </div>
                                
                                {(asset.campaign_name || asset.chapter_title) && (
                                    <div className="mt-2 space-y-1">
                                        {asset.campaign_name && (
                                            <div className="text-xs text-indigo-400 flex items-center gap-1">
                                                <BookOpen className="w-3 h-3" />
                                                {asset.campaign_name}
                                            </div>
                                        )}
                                        {asset.chapter_title && (
                                            <div className="text-xs text-zinc-500 flex items-center gap-1 ml-4">
                                                📄 {asset.chapter_title}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal de confirmation de suppression */}
            <ConfirmModal
                isOpen={!!deleteConfirm}
                onClose={() => setDeleteConfirm(null)}
                onConfirm={handleDeleteConfirm}
                title="Supprimer l'asset"
                message={`Êtes-vous sûr de vouloir supprimer "${deleteConfirm?.name}" ?\n\nCette action supprimera l'asset de la base de données ET de Cloudflare R2. Cette action est irréversible.`}
                confirmText="Supprimer"
                cancelText="Annuler"
                type="danger"
            />

            {/* Modal d'upload */}
            <UploadModal
                isOpen={showUploadModal}
                onClose={() => setShowUploadModal(false)}
                onUploadSuccess={(data) => {
                    // Recharger la liste des assets après un upload réussi
                    loadAssets();
                    setShowUploadModal(false);
                }}
            />
        </div>
    );
}

