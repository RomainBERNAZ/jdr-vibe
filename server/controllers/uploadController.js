import fs from 'fs';
import path from 'path';
import pool from '../config/db.js';
import { uploadToR2, isR2Configured } from '../services/r2Service.js';

/**
 * Upload une image vers R2
 */
export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    // Vérifier si R2 est configuré
    if (!isR2Configured()) {
      // Si R2 n'est pas configuré, retourner juste le chemin local (pour test)
      const localUrl = `/uploads/${req.file.filename}`;
      
      // Nettoyer le fichier après réponse (optionnel)
      setTimeout(() => {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
      }, 5000); // Garder 5 secondes pour test
      
      return res.json({
        success: true,
        message: 'R2 non configuré - fichier stocké localement',
        url: localUrl,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype
      });
    }

    // Déterminer le type MIME
    const ext = path.extname(req.file.originalname).toLowerCase();
    const contentTypeMap = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };
    const contentType = contentTypeMap[ext] || req.file.mimetype || 'image/jpeg';

    // Générer une clé unique pour le fichier dans R2
    const timestamp = Date.now();
    const userId = req.user?.id || 'anonymous';
    const r2Key = `images/${userId}/${timestamp}-${path.basename(req.file.filename)}`;

    // Upload vers R2
    const publicUrl = await uploadToR2(req.file.path, r2Key, contentType);

    // Déterminer le type de fichier
    const fileType = contentType.startsWith('image/') ? 'image' : 
                     contentType.startsWith('audio/') ? 'audio' : 
                     contentType.startsWith('video/') ? 'video' : 'other';

    // Générer une URL signée pour l'accès immédiat (valide 7 jours)
    let signedUrl = publicUrl;
    if (isR2Configured()) {
        try {
            const { getSignedUrlForDownload } = await import('../services/r2Service.js');
            signedUrl = await getSignedUrlForDownload(r2Key, 7 * 24 * 60 * 60);
        } catch (error) {
            console.error('Erreur génération URL signée:', error);
            // Utiliser l'URL publique en cas d'erreur
        }
    }

    // Sauvegarder dans la base de données
    const assetResult = await pool.query(
        `INSERT INTO assets (
            user_id, 
            r2_key, 
            url, 
            filename, 
            file_type, 
            mime_type, 
            file_size
        ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
            req.user.id,
            r2Key,
            publicUrl, // Stocker l'URL publique originale
            req.file.originalname,
            fileType,
            contentType,
            req.file.size
        ]
    );

    const asset = assetResult.rows[0];
    
    // Ajouter l'URL signée à l'asset retourné
    asset.signed_url = signedUrl;

    // Nettoyer le fichier local après upload
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.json({
      success: true,
      message: 'Image uploadée avec succès vers Cloudflare R2',
      url: signedUrl, // Retourner l'URL signée pour l'affichage immédiat
      original_url: publicUrl, // Garder l'URL originale aussi
      r2Key: r2Key,
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: contentType,
      asset: asset // Retourner l'asset créé en base
    });

  } catch (error) {
    console.error('Erreur upload image:', error);
    
    // Nettoyer le fichier en cas d'erreur
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Erreur nettoyage fichier:', cleanupError);
      }
    }

    res.status(500).json({ 
      error: 'Erreur lors de l\'upload de l\'image',
      details: error.message 
    });
  }
};

