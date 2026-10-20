import express from 'express';
import { getCampaigns, createCampaign, getCampaign, updateCampaign, addPlayer, getCampaignSession, saveCampaignCharacterSheet } from '../controllers/campaignController.js';
import { authenticateToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { requireTrustedOrigin } from '../middleware/trustedOrigin.js';
import { addPlayerSchema, campaignCharacterSheetSchema, campaignIdSchema, createCampaignSchema, updateCampaignSchema } from '../validation/schemas.js';

const router = express.Router();

router.use(authenticateToken);
router.get('/', getCampaigns);
router.post('/', requireTrustedOrigin, validate(createCampaignSchema), createCampaign);
router.get('/:id/session', validate(campaignIdSchema, 'params'), getCampaignSession);
router.put('/:id/session', requireTrustedOrigin, validate(campaignIdSchema, 'params'), validate(campaignCharacterSheetSchema), saveCampaignCharacterSheet);
router.get('/:id', validate(campaignIdSchema, 'params'), getCampaign);
router.put('/:id', requireTrustedOrigin, validate(campaignIdSchema, 'params'), validate(updateCampaignSchema), updateCampaign);
router.post('/:id/players', requireTrustedOrigin, validate(campaignIdSchema, 'params'), validate(addPlayerSchema), addPlayer);

export default router;
