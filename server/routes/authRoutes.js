import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { register, login, logout } from '../controllers/authController.js';
import { validate } from '../middleware/validate.js';
import { credentialsSchema } from '../validation/schemas.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireTrustedOrigin } from '../middleware/trustedOrigin.js';

const router = express.Router();
const authRateLimit = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 10,
	standardHeaders: 'draft-8',
	legacyHeaders: false,
	message: { error: 'Too many authentication attempts. Try again later.' }
});

router.post('/register', requireTrustedOrigin, authRateLimit, validate(credentialsSchema), register);
router.post('/login', requireTrustedOrigin, authRateLimit, validate(credentialsSchema), login);
router.get('/me', authenticateToken, (req, res) => {
	res.json({ user: { id: req.user.id, email: req.user.email } });
});
router.post('/logout', requireTrustedOrigin, logout);

export default router;

