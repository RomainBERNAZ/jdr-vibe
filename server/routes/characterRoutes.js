import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { createCharacter, getCharacters, getCharacter, updateCharacter, deleteCharacter } from '../controllers/characterController.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', getCharacters);
router.post('/', createCharacter);
router.get('/:id', getCharacter);
router.put('/:id', updateCharacter);
router.delete('/:id', deleteCharacter);

export default router;

