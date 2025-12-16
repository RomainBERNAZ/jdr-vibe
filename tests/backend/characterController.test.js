import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createCharacter,
  getCharacters,
  getCharacter,
  updateCharacter,
  deleteCharacter,
} from '../../server/controllers/characterController.js';

// Mock dependencies
vi.mock('../../server/config/db.js', () => ({
  default: {
    query: vi.fn(),
  },
}));

import pool from '../../server/config/db.js';

describe('Character Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createCharacter', () => {
    it('should create a character with default stats', async () => {
      const req = {
        user: { id: 1 },
        body: {
          name: 'Test Hero',
          race: 'Human',
          class: 'Warrior',
        },
      };
      const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      };

      const mockCharacter = {
        id: 1,
        name: 'Test Hero',
        race: 'Human',
        class: 'Warrior',
        level: 1,
        hp_current: 10,
        hp_max: 10,
      };

      pool.query.mockResolvedValue({ rows: [mockCharacter] });

      await createCharacter(req, res);

      expect(pool.query).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockCharacter);
    });

    it('should create a character with custom stats', async () => {
      const req = {
        user: { id: 1 },
        body: {
          name: 'Test Hero',
          race: 'Elf',
          class: 'Mage',
          stats: { str: 8, dex: 14, con: 12, int: 16, wis: 13, cha: 10 },
        },
      };
      const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      };

      const mockCharacter = {
        id: 1,
        name: 'Test Hero',
        stats: { str: 8, dex: 14, con: 12, int: 16, wis: 13, cha: 10 },
      };

      pool.query.mockResolvedValue({ rows: [mockCharacter] });

      await createCharacter(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockCharacter);
    });
  });

  describe('getCharacters', () => {
    it('should return all user characters', async () => {
      const req = {
        user: { id: 1 },
      };
      const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      };

      const mockCharacters = [
        { id: 1, name: 'Hero 1', user_id: 1 },
        { id: 2, name: 'Hero 2', user_id: 1 },
      ];

      pool.query.mockResolvedValue({ rows: mockCharacters });

      await getCharacters(req, res);

      expect(pool.query).toHaveBeenCalledWith(
        'SELECT * FROM characters WHERE user_id = $1 ORDER BY created_at DESC',
        [1]
      );
      expect(res.json).toHaveBeenCalledWith(mockCharacters);
    });
  });

  describe('getCharacter', () => {
    it('should return a character if user is owner', async () => {
      const req = {
        user: { id: 1 },
        params: { id: '1' },
      };
      const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      };

      const mockCharacter = { id: 1, name: 'Hero 1', user_id: 1 };

      pool.query.mockResolvedValue({ rows: [mockCharacter] });

      await getCharacter(req, res);

      expect(pool.query).toHaveBeenCalledWith(
        'SELECT * FROM characters WHERE id = $1 AND user_id = $2',
        ['1', 1]
      );
      expect(res.json).toHaveBeenCalledWith(mockCharacter);
    });

    it('should return 404 if character not found', async () => {
      const req = {
        user: { id: 1 },
        params: { id: '999' },
      };
      const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      };

      pool.query.mockResolvedValue({ rows: [] });

      await getCharacter(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Personnage non trouvé' });
    });
  });

  describe('updateCharacter', () => {
    it('should update character fields', async () => {
      const req = {
        user: { id: 1 },
        params: { id: '1' },
        body: {
          hp_current: 8,
          gold: 50,
        },
      };
      const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      };

      const mockCharacter = { id: 1, name: 'Hero 1', hp_current: 8, gold: 50 };

      pool.query.mockResolvedValue({ rows: [mockCharacter] });

      await updateCharacter(req, res);

      expect(res.json).toHaveBeenCalledWith(mockCharacter);
    });

    it('should return 404 if character not found', async () => {
      const req = {
        user: { id: 1 },
        params: { id: '999' },
        body: { hp_current: 8 },
      };
      const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      };

      pool.query.mockResolvedValue({ rows: [] });

      await updateCharacter(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Personnage non trouvé ou non autorisé' });
    });

    it('should handle JSON fields like stats and inventory', async () => {
      const req = {
        user: { id: 1 },
        params: { id: '1' },
        body: {
          stats: { str: 12, dex: 10 },
          inventory: ['Sword', 'Shield'],
        },
      };
      const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      };

      const mockCharacter = {
        id: 1,
        stats: { str: 12, dex: 10 },
        inventory: ['Sword', 'Shield'],
      };

      pool.query.mockResolvedValue({ rows: [mockCharacter] });

      await updateCharacter(req, res);

      expect(pool.query).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockCharacter);
    });
  });

  describe('deleteCharacter', () => {
    it('should delete character if user is owner', async () => {
      const req = {
        user: { id: 1 },
        params: { id: '1' },
      };
      const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      };

      pool.query.mockResolvedValue({ rows: [{ id: 1 }] });

      await deleteCharacter(req, res);

      expect(pool.query).toHaveBeenCalledWith(
        'DELETE FROM characters WHERE id = $1 AND user_id = $2 RETURNING id',
        ['1', 1]
      );
      expect(res.json).toHaveBeenCalledWith({ message: 'Personnage supprimé' });
    });

    it('should return 404 if character not found', async () => {
      const req = {
        user: { id: 1 },
        params: { id: '999' },
      };
      const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      };

      pool.query.mockResolvedValue({ rows: [] });

      await deleteCharacter(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Personnage non trouvé' });
    });
  });
});
