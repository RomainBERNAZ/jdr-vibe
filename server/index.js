import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config'; // Charger les variables d'environnement
import fs from 'fs';

import authRoutes from './routes/authRoutes.js';
import campaignRoutes from './routes/campaignRoutes.js';
import characterRoutes from './routes/characterRoutes.js';
import voiceRoutes from './routes/voiceRoutes.js';
import runMigrations from './utils/migrate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const app = express();

// Ensure uploads directory exists
const uploadsDir = path.join(rootDir, 'uploads');
if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('📁 Created uploads directory');
}

app.use(express.json());
app.use(cors());

app.use('/api', authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/characters', characterRoutes);
app.use('/api/voice', voiceRoutes);

// Serve Frontend
app.use(express.static(path.join(rootDir, 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(rootDir, 'dist', 'index.html'));
});

const PORT = 3000;
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await runMigrations(); // Auto-create tables on startup
});

