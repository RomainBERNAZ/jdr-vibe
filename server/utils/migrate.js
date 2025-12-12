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
        
        // Run additional migrations
        const migrations = [
            'migration_add_missing_columns.sql',
            'migration_add_assets_table.sql'
        ];

        for (const migrationFile of migrations) {
            const migrationPath = path.resolve(__dirname, '../../', migrationFile);
            if (fs.existsSync(migrationPath)) {
                console.log(`🔄 Running migration: ${migrationFile}...`);
                try {
                    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
                    await pool.query(migrationSql);
                    console.log(`✅ Migration ${migrationFile} completed.`);
                } catch (migrationErr) {
                    // If table/columns already exist, that's okay
                    if (migrationErr.message && (
                        migrationErr.message.includes('already exists') ||
                        migrationErr.message.includes('duplicate key')
                    )) {
                        console.log(`ℹ️ Migration ${migrationFile} already applied, skipping...`);
                    } else {
                        console.error(`⚠️ Error running migration ${migrationFile} (non-fatal):`, migrationErr.message);
                    }
                }
            }
        }
    } catch (err) {
        console.error('❌ Error initializing database:', err);
        throw err; // Re-throw to prevent server from starting with broken DB
    }
};

export default runMigrations;


