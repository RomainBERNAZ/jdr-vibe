import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';

// Configuration Cloudflare R2
// R2 est compatible avec l'API S3, donc on utilise le SDK AWS S3
const r2Client = new S3Client({
    region: 'auto', // Cloudflare R2 utilise 'auto' comme région
    endpoint: process.env.R2_ENDPOINT, // Ex: https://xxxxx.r2.cloudflarestorage.com
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME;

/**
 * Upload un fichier vers R2
 * @param {string} filePath - Chemin local du fichier
 * @param {string} key - Clé (nom) du fichier dans R2
 * @param {string} contentType - Type MIME du fichier (ex: 'audio/mpeg', 'audio/wav')
 * @returns {Promise<string>} URL publique du fichier uploadé
 */
export const uploadToR2 = async (filePath, key, contentType = 'application/octet-stream') => {
    try {
        if (!BUCKET_NAME || !process.env.R2_ENDPOINT) {
            throw new Error('Configuration R2 manquante. Vérifiez vos variables d\'environnement.');
        }

        const fileContent = fs.readFileSync(filePath);

        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            Body: fileContent,
            ContentType: contentType,
        });

        await r2Client.send(command);

        // Construire l'URL publique si vous avez configuré un domaine personnalisé
        // Sinon, utilisez l'endpoint R2 avec le bucket
        const publicUrl = process.env.R2_PUBLIC_URL 
            ? `${process.env.R2_PUBLIC_URL}/${key}`
            : `${process.env.R2_ENDPOINT}/${BUCKET_NAME}/${key}`;

        console.log(`✅ Fichier uploadé vers R2: ${key}`);
        return publicUrl;
    } catch (error) {
        console.error('❌ Erreur upload R2:', error);
        throw error;
    }
};

/**
 * Upload un buffer directement vers R2 (sans fichier temporaire)
 * @param {Buffer} buffer - Contenu du fichier
 * @param {string} key - Clé (nom) du fichier dans R2
 * @param {string} contentType - Type MIME du fichier
 * @returns {Promise<string>} URL publique du fichier uploadé
 */
export const uploadBufferToR2 = async (buffer, key, contentType = 'application/octet-stream') => {
    try {
        if (!BUCKET_NAME || !process.env.R2_ENDPOINT) {
            throw new Error('Configuration R2 manquante. Vérifiez vos variables d\'environnement.');
        }

        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            Body: buffer,
            ContentType: contentType,
        });

        await r2Client.send(command);

        const publicUrl = process.env.R2_PUBLIC_URL 
            ? `${process.env.R2_PUBLIC_URL}/${key}`
            : `${process.env.R2_ENDPOINT}/${BUCKET_NAME}/${key}`;

        console.log(`✅ Buffer uploadé vers R2: ${key}`);
        return publicUrl;
    } catch (error) {
        console.error('❌ Erreur upload R2:', error);
        throw error;
    }
};

/**
 * Génère une URL signée temporaire pour télécharger un fichier privé
 * @param {string} key - Clé du fichier dans R2
 * @param {number} expiresIn - Durée de validité en secondes (défaut: 3600 = 1h)
 * @returns {Promise<string>} URL signée
 */
export const getSignedUrlForDownload = async (key, expiresIn = 3600) => {
    try {
        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        });

        const url = await getSignedUrl(r2Client, command, { expiresIn });
        return url;
    } catch (error) {
        console.error('❌ Erreur génération URL signée:', error);
        throw error;
    }
};

/**
 * Supprime un fichier de R2
 * @param {string} key - Clé du fichier à supprimer
 */
export const deleteFromR2 = async (key) => {
    try {
        const command = new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        });

        await r2Client.send(command);
        console.log(`✅ Fichier supprimé de R2: ${key}`);
    } catch (error) {
        console.error('❌ Erreur suppression R2:', error);
        throw error;
    }
};

/**
 * Vérifie si R2 est configuré
 * @returns {boolean}
 */
export const isR2Configured = () => {
    return !!(
        process.env.R2_ENDPOINT &&
        process.env.R2_ACCESS_KEY_ID &&
        process.env.R2_SECRET_ACCESS_KEY &&
        process.env.R2_BUCKET_NAME
    );
};

