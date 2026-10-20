import assert from 'node:assert/strict';
import test from 'node:test';
import { runMigrations } from '../utils/migrate.js';

const createDatabase = ({ failOn = null } = {}) => {
  const statements = [];
  const appliedVersions = new Set();
  const database = {
    async query(sql, values = []) {
      statements.push({ sql, values });
      if (sql.startsWith('SELECT 1 FROM schema_migrations')) {
        return { rows: appliedVersions.has(values[0]) ? [{ version: values[0] }] : [] };
      }
      if (sql.startsWith('INSERT INTO schema_migrations')) {
        appliedVersions.add(values[0]);
      }
      if (failOn && sql.includes(failOn)) throw new Error('database unavailable');
      return { rows: [] };
    }
  };
  return { database, statements, appliedVersions };
};

test('runs each versioned migration once and in order', async () => {
  const { database, statements, appliedVersions } = createDatabase();

  await runMigrations(database);
  await runMigrations(database);

  assert.deepEqual([...appliedVersions], ['000_init', '001_campaigns', '002_campaign_sessions', '003_campaign_turns']);
  assert.equal(statements.filter(({ sql }) => sql.includes('CREATE TABLE IF NOT EXISTS users')).length, 1);
  assert.equal(statements.filter(({ sql }) => sql.includes('ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS status')).length, 1);
  assert.equal(statements.filter(({ sql }) => sql.includes('CREATE TABLE IF NOT EXISTS campaign_sessions')).length, 1);
  assert.equal(statements.filter(({ sql }) => sql.includes('CREATE TABLE IF NOT EXISTS campaign_turns')).length, 1);
});

test('rolls back and stops startup when a migration fails', async () => {
  const { database, statements } = createDatabase({ failOn: 'CREATE TABLE IF NOT EXISTS users' });

  await assert.rejects(runMigrations(database), /database unavailable/);
  assert.ok(statements.some(({ sql }) => sql === 'ROLLBACK'));
  assert.ok(!statements.some(({ sql }) => sql === 'COMMIT'));
});