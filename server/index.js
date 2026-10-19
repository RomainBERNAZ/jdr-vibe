import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config'; // Charger les variables d'environnement
import fs from 'fs';

import authRoutes from './routes/authRoutes.js';
import campaignRoutes from './routes/campaignRoutes.js';
import voiceRoutes from './routes/voiceRoutes.js';
import pool from './config/db.js';
import runMigrations from './utils/migrate.js';
import { pruneUploads, startUploadCleanup } from './utils/audioCleanup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const app = express();
const configuredOrigins = (process.env.CORS_ORIGINS ?? (process.env.NODE_ENV === 'production'
  ? ''
  : 'http://localhost:5173,http://127.0.0.1:5173'))
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = new Set(configuredOrigins);
const proxyHops = process.env.TRUST_PROXY_HOPS?.trim();

if (proxyHops) {
  const parsedProxyHops = Number(proxyHops);
  if (!Number.isInteger(parsedProxyHops) || parsedProxyHops < 1 || parsedProxyHops > 10) {
    throw new Error('TRUST_PROXY_HOPS must be an integer between 1 and 10');
  }
  app.set('trust proxy', parsedProxyHops);
}

// Ensure uploads directory exists
const uploadsDir = path.join(rootDir, 'uploads');
if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('📁 Created uploads directory');
}

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(cors({
  credentials: true,
  origin(origin, callback) {
    callback(null, !origin || allowedOrigins.has(origin));
  }
}));

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'unavailable' });
  }
});

app.use('/api', authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/voice', voiceRoutes);

// Serve Frontend
app.use(express.static(path.join(rootDir, 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(rootDir, 'dist', 'index.html'));
});

const PORT = Number(process.env.PORT || 3000);

const startServer = async () => {
  try {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
    if (!process.env.JWT_SECRET || Buffer.byteLength(process.env.JWT_SECRET, 'utf8') < 32) {
      throw new Error('JWT_SECRET must contain at least 32 bytes');
    }
    await pruneUploads(uploadsDir);
    await runMigrations();
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    const stopUploadCleanup = startUploadCleanup(uploadsDir);
    const shutdown = () => {
      stopUploadCleanup();
      const forceCloseTimer = setTimeout(() => server.closeAllConnections(), 10_000);
      forceCloseTimer.unref();
      server.close(async () => {
        clearTimeout(forceCloseTimer);
        try {
          await pool.end();
        } catch (error) {
          console.error('Database shutdown failed:', error);
          process.exitCode = 1;
        }
      });
    };
    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    await pool.end();
    process.exitCode = 1;
  }
};

startServer();

