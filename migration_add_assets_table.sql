-- Migration: Créer la table assets pour stocker les fichiers uploadés vers R2
CREATE TABLE IF NOT EXISTS assets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
    chapter_id INTEGER REFERENCES campaign_chapters(id) ON DELETE SET NULL,
    r2_key VARCHAR(500) NOT NULL, -- Clé dans R2 (ex: images/123/timestamp-filename.jpg)
    url TEXT NOT NULL, -- URL publique de l'asset
    filename VARCHAR(255) NOT NULL, -- Nom original du fichier
    file_type VARCHAR(50) NOT NULL, -- Type de fichier (image, audio, etc.)
    mime_type VARCHAR(100) NOT NULL, -- Type MIME (image/jpeg, audio/mpeg, etc.)
    file_size BIGINT NOT NULL, -- Taille en octets
    title VARCHAR(255), -- Titre optionnel pour l'asset
    description TEXT, -- Description optionnelle (utile pour OpenAI)
    tags TEXT[], -- Tags pour faciliter la recherche
    metadata JSONB DEFAULT '{}', -- Métadonnées additionnelles (dimensions image, durée audio, etc.)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour améliorer les performances de recherche
CREATE INDEX IF NOT EXISTS idx_assets_user_id ON assets(user_id);
CREATE INDEX IF NOT EXISTS idx_assets_campaign_id ON assets(campaign_id);
CREATE INDEX IF NOT EXISTS idx_assets_chapter_id ON assets(chapter_id);
CREATE INDEX IF NOT EXISTS idx_assets_file_type ON assets(file_type);
CREATE INDEX IF NOT EXISTS idx_assets_created_at ON assets(created_at DESC);

