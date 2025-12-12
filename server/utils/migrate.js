import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runMigrations = async () => {
    try {
        console.log('🔄 Checking database tables...');
        
        // Lire le fichier init.sql à la racine
        const sqlPath = path.resolve(__dirname, '../../init.sql');
        
        if (!fs.existsSync(sqlPath)) {
            console.warn('⚠️ init.sql not found at', sqlPath);
            return;
        }

        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        // Exécuter le SQL
        await pool.query(sql);
        console.log('✅ Database tables initialized successfully.');
    } catch (err) {
        console.error('❌ Error initializing database:', err);
    }
};

export default runMigrations;


