import express from 'express';
import multer from 'multer';
import path from 'path';
import { transcribeAndChat } from '../controllers/voiceController.js';

const router = express.Router();

// Configuration de Multer pour stocker temporairement les fichiers audio
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `audio-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage: storage });

// Route POST /api/voice/chat
router.post('/chat', upload.single('audio'), transcribeAndChat);

export default router;



