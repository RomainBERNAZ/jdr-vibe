import express from 'express';
import { 
    getCampaigns, 
    getCampaign, 
    createCampaign, 
    updateCampaign, 
    deleteCampaign,
    addPlayer,
    closeChapter // Import
} from '../controllers/campaignController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', getCampaigns);
router.post('/', createCampaign);
router.get('/:id', getCampaign);
router.put('/:id', updateCampaign);
router.delete('/:id', deleteCampaign);
router.post('/:id/players', addPlayer);
router.post('/:id/chapters', closeChapter); // New Route

export default router;
