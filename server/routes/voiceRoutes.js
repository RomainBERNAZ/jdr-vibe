import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { rateLimit } from 'express-rate-limit';
import { authenticateToken } from '../middleware/auth.js';
import { requireTrustedOrigin } from '../middleware/trustedOrigin.js';
import { cleanupUploadedAudio, transcribeAndChat } from '../controllers/voiceController.js';
import { voiceTurnSchema } from '../validation/schemas.js';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.resolve(__dirname, '../../uploads');

const chatRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Trop de requêtes vocales. Réessayez plus tard.' }
});

// Configuration de Multer pour stocker temporairement les fichiers audio
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, `audio-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024,
    files: 1,
    fields: 2,
    parts: 3,
    fieldSize: 512 * 1024
  }
});

const uploadAudio = (req, res, next) => {
  upload.single('audio')(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(status).json({ error: 'Fichier audio invalide ou trop volumineux.' });
    }
    if (error) return next(error);
    next();
  });
};

const validateVoiceTurn = (req, res, next) => {
  const result = voiceTurnSchema.safeParse(req.body ?? {});
  if (!result.success) {
    cleanupUploadedAudio(req.file?.path);
    return res.status(400).json({
      error: 'Invalid request',
      details: result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message
      }))
    });
  }

  req.body = result.data;
  next();
};

// Route POST /api/voice/chat
router.use(authenticateToken);
router.post('/chat', requireTrustedOrigin, chatRateLimit, uploadAudio, validateVoiceTurn, transcribeAndChat);

export default router;


