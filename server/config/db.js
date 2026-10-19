import pg from 'pg';
import fs from 'node:fs';
const { Pool } = pg;

const ssl = process.env.NODE_ENV === 'production'
  ? {
      rejectUnauthorized: true,
      ...(process.env.DATABASE_SSL_CA_FILE
        ? { ca: fs.readFileSync(process.env.DATABASE_SSL_CA_FILE, 'utf8') }
        : {})
    }
  : false;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export default pool;

