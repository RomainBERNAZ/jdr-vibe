// Standalone script to run migrations manually
// Usage: node server/utils/runMigration.js

import pool from '../config/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runMigration = async () => {
    try {
        console.log('🔄 Running migration: Add missing columns...');
        
        const migrationPath = path.resolve(__dirname, '../../migration_add_missing_columns.sql');
        
        if (!fs.existsSync(migrationPath)) {
            console.error('❌ Migration file not found at:', migrationPath);
            process.exit(1);
        }

        const migrationSql = fs.readFileSync(migrationPath, 'utf8');
        
        // Execute migration
        await pool.query(migrationSql);
        console.log('✅ Migration completed successfully.');
        
        // Verify columns exist
        const checkMessages = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'campaign_messages' AND column_name = 'chapter_id'
        `);
        
        const checkCampaigns = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'campaigns' AND column_name = 'audio_enabled'
        `);
        
        if (checkMessages.rows.length > 0) {
            console.log('✅ chapter_id column exists in campaign_messages');
        } else {
            console.warn('⚠️ chapter_id column not found in campaign_messages');
        }
        
        if (checkCampaigns.rows.length > 0) {
            console.log('✅ audio_enabled column exists in campaigns');
        } else {
            console.warn('⚠️ audio_enabled column not found in campaigns');
        }
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Error running migration:', err);
        process.exit(1);
    }
};

runMigration();

