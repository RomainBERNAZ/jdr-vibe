import express from 'express';
import multer from 'multer';
import path from 'path';
import { uploadImage } from '../controllers/uploadController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Configuration de Multer pour les images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `image-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// Filtrer uniquement les images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Seules les images (JPEG, PNG, GIF, WEBP) sont autorisées'));
  }
};

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: fileFilter
});

// Route POST /api/upload/image (protégée par authentification)
router.post('/image', authenticateToken, upload.single('image'), uploadImage);

export default router;

