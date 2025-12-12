import pool from '../config/db.js';
import { getSignedUrlForDownload, isR2Configured } from '../services/r2Service.js';

/**
 * Récupère tous les assets d'un utilisateur avec URLs signées si nécessaire
 */
export const getAssets = async (req, res) => {
    try {
        const { campaignId, chapterId, fileType } = req.query;
        
        let query = `
            SELECT a.*, 
                   c.name as campaign_name,
                   ch.title as chapter_title
            FROM assets a
            LEFT JOIN campaigns c ON a.campaign_id = c.id
            LEFT JOIN campaign_chapters ch ON a.chapter_id = ch.id
            WHERE a.user_id = $1
        `;
        const params = [req.user.id];
        let paramIndex = 2;

        if (campaignId) {
            query += ` AND a.campaign_id = $${paramIndex}`;
            params.push(campaignId);
            paramIndex++;
        }

        if (chapterId) {
            query += ` AND a.chapter_id = $${paramIndex}`;
            params.push(chapterId);
            paramIndex++;
        }

        if (fileType) {
            query += ` AND a.file_type = $${paramIndex}`;
            params.push(fileType);
            paramIndex++;
        }

        query += ` ORDER BY a.created_at DESC`;

        const result = await pool.query(query, params);
        
        // Générer des URLs signées si R2 est configuré et que le bucket n'est pas public
        const assetsWithSignedUrls = await Promise.all(
            result.rows.map(async (asset) => {
                if (isR2Configured()) {
                    try {
                        // Générer une URL signée valide 7 jours
                        const signedUrl = await getSignedUrlForDownload(asset.r2_key, 7 * 24 * 60 * 60);
                        return {
                            ...asset,
                            signed_url: signedUrl,
                            url: signedUrl // Utiliser l'URL signée comme URL principale
                        };
                    } catch (error) {
                        console.error(`Erreur génération URL signée pour ${asset.r2_key}:`, error);
                        return asset; // Retourner l'asset avec l'URL originale en cas d'erreur
                    }
                }
                return asset;
            })
        );
        
        res.json(assetsWithSignedUrls);
    } catch (error) {
        console.error('Erreur récupération assets:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des assets', details: error.message });
    }
};

/**
 * Récupère un asset par son ID avec URL signée si nécessaire
 */
export const getAsset = async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            `SELECT a.*, 
                    c.name as campaign_name,
                    ch.title as chapter_title
             FROM assets a
             LEFT JOIN campaigns c ON a.campaign_id = c.id
             LEFT JOIN campaign_chapters ch ON a.chapter_id = ch.id
             WHERE a.id = $1 AND a.user_id = $2`,
            [id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Asset non trouvé' });
        }

        const asset = result.rows[0];
        
        // Générer une URL signée si R2 est configuré
        if (isR2Configured()) {
            try {
                const signedUrl = await getSignedUrlForDownload(asset.r2_key, 7 * 24 * 60 * 60);
                asset.signed_url = signedUrl;
                asset.url = signedUrl; // Utiliser l'URL signée comme URL principale
            } catch (error) {
                console.error(`Erreur génération URL signée pour ${asset.r2_key}:`, error);
            }
        }

        res.json(asset);
    } catch (error) {
        console.error('Erreur récupération asset:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération de l\'asset', details: error.message });
    }
};

/**
 * Met à jour un asset (titre, description, tags, etc.)
 */
export const updateAsset = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, tags, campaign_id, chapter_id, metadata } = req.body;

        // Vérifier que l'asset appartient à l'utilisateur
        const checkResult = await pool.query(
            'SELECT id FROM assets WHERE id = $1 AND user_id = $2',
            [id, req.user.id]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Asset non trouvé ou non autorisé' });
        }

        // Construire la requête de mise à jour dynamiquement
        const updates = [];
        const params = [];
        let paramIndex = 1;

        if (title !== undefined) {
            updates.push(`title = $${paramIndex++}`);
            params.push(title);
        }
        if (description !== undefined) {
            updates.push(`description = $${paramIndex++}`);
            params.push(description);
        }
        if (tags !== undefined) {
            updates.push(`tags = $${paramIndex++}`);
            params.push(Array.isArray(tags) ? tags : [tags]);
        }
        if (campaign_id !== undefined) {
            updates.push(`campaign_id = $${paramIndex++}`);
            params.push(campaign_id || null);
        }
        if (chapter_id !== undefined) {
            updates.push(`chapter_id = $${paramIndex++}`);
            params.push(chapter_id || null);
        }
        if (metadata !== undefined) {
            updates.push(`metadata = $${paramIndex++}`);
            params.push(JSON.stringify(metadata));
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
        }

        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        params.push(id, req.user.id);

        const query = `
            UPDATE assets 
            SET ${updates.join(', ')}
            WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}
            RETURNING *
        `;

        const result = await pool.query(query, params);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Asset non trouvé' });
        }

        // Récupérer l'asset mis à jour avec les informations de campagne et chapitre
        const assetResult = await pool.query(
            `SELECT a.*, 
                    c.name as campaign_name,
                    ch.title as chapter_title
             FROM assets a
             LEFT JOIN campaigns c ON a.campaign_id = c.id
             LEFT JOIN campaign_chapters ch ON a.chapter_id = ch.id
             WHERE a.id = $1 AND a.user_id = $2`,
            [id, req.user.id]
        );

        if (assetResult.rows.length === 0) {
            return res.status(404).json({ error: 'Asset non trouvé' });
        }

        const asset = assetResult.rows[0];
        
        // Générer une URL signée si R2 est configuré
        if (isR2Configured()) {
            try {
                const signedUrl = await getSignedUrlForDownload(asset.r2_key, 7 * 24 * 60 * 60);
                asset.signed_url = signedUrl;
                asset.url = signedUrl; // Utiliser l'URL signée comme URL principale
            } catch (error) {
                console.error(`Erreur génération URL signée pour ${asset.r2_key}:`, error);
                // Continuer avec l'URL originale en cas d'erreur
            }
        }
        
        res.json(asset);
    } catch (error) {
        console.error('Erreur mise à jour asset:', error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'asset', details: error.message });
    }
};

/**
 * Supprime un asset (et le fichier dans R2)
 */
export const deleteAsset = async (req, res) => {
    try {
        const { id } = req.params;

        // Vérifier que l'asset appartient à l'utilisateur
        const checkResult = await pool.query(
            'SELECT r2_key FROM assets WHERE id = $1 AND user_id = $2',
            [id, req.user.id]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Asset non trouvé ou non autorisé' });
        }

        const r2Key = checkResult.rows[0].r2_key;

        // Supprimer de R2 si configuré
        if (isR2Configured()) {
            try {
                const { deleteFromR2 } = await import('../services/r2Service.js');
                await deleteFromR2(r2Key);
                console.log(`✅ Fichier R2 supprimé: ${r2Key}`);
            } catch (r2Error) {
                console.error('⚠️ Erreur suppression R2 (continuation avec suppression DB):', r2Error);
                // On continue quand même avec la suppression en base même si R2 échoue
                // pour éviter que l'asset reste "orphelin" en base
            }
        }

        // Supprimer de la base de données
        await pool.query('DELETE FROM assets WHERE id = $1', [id]);

        res.json({ 
            message: 'Asset supprimé avec succès',
            r2Deleted: isR2Configured()
        });
    } catch (error) {
        console.error('Erreur suppression asset:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression de l\'asset', details: error.message });
    }
};

