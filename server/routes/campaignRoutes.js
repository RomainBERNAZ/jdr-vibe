import express from 'express';
import { getCampaigns, createCampaign } from '../controllers/campaignController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);
router.get('/', getCampaigns);
router.post('/', createCampaign);

export default router;

