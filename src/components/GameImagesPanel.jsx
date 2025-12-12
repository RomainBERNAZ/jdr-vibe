import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, X } from 'lucide-react';
import { assetApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

/**
 * Composant pour afficher les images de la campagne basées sur les tags mentionnés
 */
export default function GameImagesPanel({ campaignId, conversation, onImageClick }) {
    const { token } = useAuth();
    const [displayedImages, setDisplayedImages] = useState([]);
    const [allAssets, setAllAssets] = useState([]);

    // Charger tous les assets de la campagne au démarrage
    useEffect(() => {
        const loadAssets = async () => {
            if (!campaignId || !token) return;
            try {
                const data = await assetApi.list(token, { campaignId, fileType: 'image' });
                setAllAssets(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error('Erreur chargement assets:', error);
            }
        };
        loadAssets();
    }, [campaignId, token]);

    // Analyser les messages pour détecter les tags mentionnés
    useEffect(() => {
        if (allAssets.length === 0) return;

        // Extraire tous les tags des assets
        const assetTagsMap = new Map();
        allAssets.forEach(asset => {
            if (asset.tags && Array.isArray(asset.tags)) {
                asset.tags.forEach(tag => {
                    const normalizedTag = tag.toLowerCase();
                    if (!assetTagsMap.has(normalizedTag)) {
                        assetTagsMap.set(normalizedTag, []);
                    }
                    assetTagsMap.get(normalizedTag).push(asset);
                });
            }
        });

        // Analyser les derniers messages (user + ai) pour trouver des tags mentionnés
        const recentMessages = conversation.slice(-10); // Derniers 10 messages
        const mentionedTags = new Set();
        const foundImages = new Map();

        recentMessages.forEach(msg => {
            const text = msg.text?.toLowerCase() || '';
            
            // Chercher les tags dans le texte avec une recherche plus intelligente
            assetTagsMap.forEach((assets, tag) => {
                // Normaliser le tag pour la recherche
                const normalizedTag = tag.toLowerCase().trim();
                const tagWords = normalizedTag.split(/[\s-_]+/).filter(w => w.length > 2);
                
                // Vérifier si le tag complet est mentionné
                let isMentioned = text.includes(normalizedTag);
                
                // Ou si au moins 2 mots du tag sont mentionnés (pour les tags composés)
                if (!isMentioned && tagWords.length > 1) {
                    const mentionedWords = tagWords.filter(word => text.includes(word));
                    isMentioned = mentionedWords.length >= Math.min(2, tagWords.length);
                }
                
                // Ou si un mot significatif du tag est mentionné (pour les tags simples)
                if (!isMentioned && tagWords.length === 1) {
                    isMentioned = text.includes(tagWords[0]);
                }

                if (isMentioned && !mentionedTags.has(normalizedTag)) {
                    mentionedTags.add(normalizedTag);
                    // Ajouter les images associées à ce tag
                    assets.forEach(asset => {
                        if (!foundImages.has(asset.id)) {
                            foundImages.set(asset.id, asset);
                        }
                    });
                }
            });
        });

        // Convertir en tableau et prendre la première image (la plus récente)
        const imagesToShow = Array.from(foundImages.values()).slice(0, 1);
        setDisplayedImages(imagesToShow);
    }, [conversation, allAssets]);

    const handleImageClick = (asset) => {
        if (onImageClick) {
            onImageClick(asset);
        }
    };

    return (
        <div className="h-full flex flex-col bg-black/60 border-r border-zinc-800 overflow-hidden">
            <div className="p-3 border-b border-zinc-800 bg-gradient-to-b from-black/80 to-transparent shrink-0">
                <h3 className="text-zinc-400 font-serif tracking-widest text-xs uppercase flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" /> Image
                </h3>
            </div>
            
            <div className="flex-1 flex items-center justify-center p-4">
                {displayedImages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-zinc-600 text-center p-4">
                        <ImageIcon className="w-16 h-16 mb-3 opacity-20" />
                        <p className="text-xs italic">Aucune image</p>
                        <p className="text-xs mt-2 text-zinc-700">
                            Les images apparaîtront automatiquement lorsque leurs tags seront mentionnés.
                        </p>
                    </div>
                ) : (
                    displayedImages.map(asset => (
                        <div
                            key={asset.id}
                            className="w-full h-full flex items-center justify-center"
                        >
                            <img
                                src={asset.signed_url || asset.url}
                                alt={asset.title || asset.filename}
                                className="max-w-full max-h-full object-contain rounded-lg"
                                onError={(e) => {
                                    console.error('Erreur chargement image:', asset.signed_url || asset.url);
                                    e.target.style.display = 'none';
                                    e.target.parentElement.innerHTML = '<div class="flex items-center justify-center h-full text-zinc-600"><ImageIcon class="w-16 h-16 opacity-20" /></div>';
                                }}
                            />
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

