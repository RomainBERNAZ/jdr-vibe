import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrations = [
    { version: '000_init', file: 'init.sql' },
    { version: '001_campaigns', file: 'migration_v1.sql' },
    { version: '002_campaign_sessions', file: 'migration_v2.sql' }
];

export const runMigrations = async (database = pool) => {
    const client = typeof database.connect === 'function' ? await database.connect() : database;
    console.log('🔄 Checking database migrations...');

    try {
        await client.query('BEGIN');
        await client.query('SELECT pg_advisory_xact_lock($1)', [8675309]);
        await client.query(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version VARCHAR(100) PRIMARY KEY,
                applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `);

        for (const migration of migrations) {
            const applied = await client.query(
                'SELECT 1 FROM schema_migrations WHERE version = $1',
                [migration.version]
            );
            if (applied.rows.length > 0) continue;

            const sqlPath = path.resolve(__dirname, '../../', migration.file);
            if (!fs.existsSync(sqlPath)) {
                throw new Error(`Required migration file not found: ${sqlPath}`);
            }

            await client.query(fs.readFileSync(sqlPath, 'utf8'));
            await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [migration.version]);
        }

        await client.query('COMMIT');
        console.log('✅ Database migrations are up to date.');
    } catch (error) {
        try {
            await client.query('ROLLBACK');
        } catch (rollbackError) {
            console.error('❌ Migration rollback failed:', rollbackError);
        }
        throw error;
    } finally {
        if (client !== database && typeof client.release === 'function') client.release();
    }
};

export default runMigrations;

