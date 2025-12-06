import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config'; // Charger les variables d'environnement

import authRoutes from './routes/authRoutes.js';
import campaignRoutes from './routes/campaignRoutes.js';
import voiceRoutes from './routes/voiceRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const app = express();

app.use(express.json());
app.use(cors());

app.use('/api', authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/voice', voiceRoutes);

// Serve Frontend
app.use(express.static(path.join(rootDir, 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(rootDir, 'dist', 'index.html'));
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

