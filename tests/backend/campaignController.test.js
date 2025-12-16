import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
} from '../../server/controllers/campaignController.js';

// Mock dependencies
vi.mock('../../server/config/db.js', () => ({
  default: {
    query: vi.fn(),
  },
}));

vi.mock('../../server/services/openaiService.js', () => ({
  generateChapterSummary: vi.fn(),
}));

import pool from '../../server/config/db.js';

describe('Campaign Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCampaigns', () => {
    it('should return user campaigns', async () => {
      const req = {
        user: { id: 1 },
      };
      const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      };

      const mockCampaigns = [
        { id: 1, name: 'Campaign 1', user_id: 1 },
        { id: 2, name: 'Campaign 2', user_id: 1 },
      ];

      pool.query.mockResolvedValue({ rows: mockCampaigns });

      await getCampaigns(req, res);

      expect(pool.query).toHaveBeenCalledWith(
        'SELECT * FROM campaigns WHERE user_id = $1 ORDER BY created_at DESC',
        [1]
      );
      expect(res.json).toHaveBeenCalledWith(mockCampaigns);
    });

    it('should handle database errors', async () => {
      const req = {
        user: { id: 1 },
      };
      const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      };

      pool.query.mockRejectedValue(new Error('Database error'));

      await getCampaigns(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Database error' });
    });
  });

  describe('getCampaign', () => {
    it('should return campaign with players and history', async () => {
      const req = {
        params: { id: '1' },
      };
      const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      };

      const mockCampaign = { id: 1, name: 'Campaign 1', user_id: 1 };
      const mockPlayers = [{ id: 1, email: 'player@example.com' }];
      const mockHistory = [{ id: 1, content: 'Message 1' }];
      const mockChapters = [{ id: 1, title: 'Chapter 1' }];

      pool.query
        .mockResolvedValueOnce({ rows: [mockCampaign] })
        .mockResolvedValueOnce({ rows: mockPlayers })
        .mockResolvedValueOnce({ rows: mockChapters })
        .mockResolvedValueOnce({ rows: mockHistory });

      await getCampaign(req, res);

      expect(res.json).toHaveBeenCalledWith({
        ...mockCampaign,
        players: mockPlayers,
        history: mockHistory,
        chapters: mockChapters,
      });
    });

    it('should return 404 if campaign not found', async () => {
      const req = {
        params: { id: '999' },
      };
      const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      };

      pool.query.mockResolvedValue({ rows: [] });

      await getCampaign(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Campaign not found' });
    });

    it('should return 400 if campaign ID is invalid', async () => {
      const req = {
        params: { id: 'undefined' },
      };
      const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      };

      await getCampaign(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid campaign ID' });
    });
  });

  describe('createCampaign', () => {
    it('should create a new campaign', async () => {
      const req = {
        user: { id: 1 },
        body: {
          name: 'New Campaign',
          system: 'D&D 5e',
          audio_enabled: true,
        },
      };
      const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      };

      const mockCampaign = {
        id: 1,
        name: 'New Campaign',
        system: 'D&D 5e',
        user_id: 1,
        status: 'pending',
        audio_enabled: true,
      };

      pool.query.mockResolvedValue({ rows: [mockCampaign] });

      await createCampaign(req, res);

      expect(pool.query).toHaveBeenCalledWith(
        'INSERT INTO campaigns (name, system, user_id, status, audio_enabled) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        ['New Campaign', 'D&D 5e', 1, 'pending', true]
      );
      expect(res.json).toHaveBeenCalledWith(mockCampaign);
    });

    it('should default audio_enabled to true if not provided', async () => {
      const req = {
        user: { id: 1 },
        body: {
          name: 'New Campaign',
          system: 'D&D 5e',
        },
      };
      const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      };

      const mockCampaign = {
        id: 1,
        name: 'New Campaign',
        audio_enabled: true,
      };

      pool.query.mockResolvedValue({ rows: [mockCampaign] });

      await createCampaign(req, res);

      expect(pool.query).toHaveBeenCalledWith(
        expect.any(String),
        ['New Campaign', 'D&D 5e', 1, 'pending', true]
      );
    });
  });

  describe('updateCampaign', () => {
    it('should update campaign if user is owner', async () => {
      const req = {
        user: { id: 1 },
        params: { id: '1' },
        body: {
          name: 'Updated Campaign',
          description: 'New description',
        },
      };
      const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      };

      pool.query
        .mockResolvedValueOnce({ rows: [{ user_id: 1 }] })
        .mockResolvedValueOnce({
          rows: [{ id: 1, name: 'Updated Campaign', description: 'New description' }],
        });

      await updateCampaign(req, res);

      expect(res.json).toHaveBeenCalled();
    });

    it('should return 403 if user is not owner', async () => {
      const req = {
        user: { id: 2 },
        params: { id: '1' },
        body: { name: 'Updated Campaign' },
      };
      const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      };

      pool.query.mockResolvedValue({ rows: [{ user_id: 1 }] });

      await updateCampaign(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });
  });

  describe('deleteCampaign', () => {
    it('should delete campaign if user is owner', async () => {
      const req = {
        user: { id: 1 },
        params: { id: '1' },
      };
      const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      };

      pool.query
        .mockResolvedValueOnce({ rows: [{ user_id: 1 }] })
        .mockResolvedValueOnce({});

      await deleteCampaign(req, res);

      expect(pool.query).toHaveBeenCalledWith('DELETE FROM campaigns WHERE id = $1', ['1']);
      expect(res.json).toHaveBeenCalledWith({ message: 'Campagne supprimée avec succès' });
    });

    it('should return 403 if user is not owner', async () => {
      const req = {
        user: { id: 2 },
        params: { id: '1' },
      };
      const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      };

      pool.query.mockResolvedValue({ rows: [{ user_id: 1 }] });

      await deleteCampaign(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });
  });
});
