// Script pour supprimer tous les assets de la base de données
// Usage: node server/utils/deleteAllAssets.js

import 'dotenv/config'; // Charger les variables d'environnement
import pool from '../config/db.js';

const deleteAllAssets = async () => {
    try {
        console.log('🔄 Suppression de tous les assets...');
        
        // Compter avant suppression
        const countBefore = await pool.query('SELECT COUNT(*) as count FROM assets');
        const count = parseInt(countBefore.rows[0].count);
        
        if (count === 0) {
            console.log('ℹ️ Aucun asset à supprimer.');
            process.exit(0);
        }
        
        console.log(`📊 ${count} asset(s) trouvé(s) dans la base de données.`);
        
        // Supprimer tous les assets
        const result = await pool.query('DELETE FROM assets');
        
        console.log(`✅ ${result.rowCount} asset(s) supprimé(s) avec succès.`);
        
        // Vérifier qu'il n'en reste plus
        const countAfter = await pool.query('SELECT COUNT(*) as count FROM assets');
        const remaining = parseInt(countAfter.rows[0].count);
        
        if (remaining === 0) {
            console.log('✅ Tous les assets ont été supprimés.');
        } else {
            console.warn(`⚠️ Il reste ${remaining} asset(s) en base.`);
        }
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Erreur lors de la suppression:', err);
        process.exit(1);
    }
};

deleteAllAssets();

