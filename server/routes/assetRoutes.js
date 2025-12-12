import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
    getAssets,
    getAsset,
    updateAsset,
    deleteAsset
} from '../controllers/assetController.js';

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

router.get('/', getAssets);
router.get('/:id', getAsset);
router.put('/:id', updateAsset);
router.delete('/:id', deleteAsset);

export default router;

