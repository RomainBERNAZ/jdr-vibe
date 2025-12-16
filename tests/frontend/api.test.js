import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authApi, campaignApi, characterApi, assetApi } from '../../src/services/api.js';

// Mock fetch globally
global.fetch = vi.fn();

describe('API Services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authApi', () => {
    it('should login successfully', async () => {
      const mockResponse = {
        token: 'test-token',
        user: { id: 1, email: 'test@example.com' },
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await authApi.login('test@example.com', 'password123');

      expect(global.fetch).toHaveBeenCalledWith('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
      });
      expect(result).toEqual(mockResponse);
    });

    it('should throw error on login failure', async () => {
      const mockError = { error: 'Invalid credentials' };

      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => mockError,
      });

      await expect(authApi.login('test@example.com', 'wrong')).rejects.toEqual(mockError);
    });

    it('should register successfully', async () => {
      const mockResponse = { id: 1, email: 'new@example.com' };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await authApi.register('new@example.com', 'password123');

      expect(global.fetch).toHaveBeenCalledWith('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'new@example.com', password: 'password123' }),
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('campaignApi', () => {
    const token = 'test-token';

    it('should list campaigns', async () => {
      const mockCampaigns = [{ id: 1, name: 'Campaign 1' }];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCampaigns,
      });

      const result = await campaignApi.list(token);

      expect(global.fetch).toHaveBeenCalledWith('/api/campaigns', {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(result).toEqual(mockCampaigns);
    });

    it('should get a campaign', async () => {
      const mockCampaign = { id: 1, name: 'Campaign 1' };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCampaign,
      });

      const result = await campaignApi.get(token, '1');

      expect(global.fetch).toHaveBeenCalledWith('/api/campaigns/1', {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(result).toEqual(mockCampaign);
    });

    it('should throw error on invalid campaign ID', async () => {
      await expect(campaignApi.get(token, 'undefined')).rejects.toThrow('Invalid campaign ID');
    });

    it('should create a campaign with string name', async () => {
      const mockCampaign = { id: 1, name: 'New Campaign' };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCampaign,
      });

      const result = await campaignApi.create(token, 'New Campaign');

      expect(global.fetch).toHaveBeenCalledWith('/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: 'New Campaign', system: 'D&D 5e' }),
      });
      expect(result).toEqual(mockCampaign);
    });

    it('should create a campaign with object data', async () => {
      const mockCampaign = { id: 1, name: 'New Campaign', audio_enabled: true };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCampaign,
      });

      const result = await campaignApi.create(token, { name: 'New Campaign', audio_enabled: true });

      expect(global.fetch).toHaveBeenCalledWith('/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ system: 'D&D 5e', name: 'New Campaign', audio_enabled: true }),
      });
      expect(result).toEqual(mockCampaign);
    });

    it('should update a campaign', async () => {
      const mockCampaign = { id: 1, name: 'Updated Campaign' };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCampaign,
      });

      const result = await campaignApi.update(token, '1', { name: 'Updated Campaign' });

      expect(global.fetch).toHaveBeenCalledWith('/api/campaigns/1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: 'Updated Campaign' }),
      });
      expect(result).toEqual(mockCampaign);
    });

    it('should delete a campaign', async () => {
      const mockResponse = { message: 'Campaign deleted' };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await campaignApi.delete(token, '1');

      expect(global.fetch).toHaveBeenCalledWith('/api/campaigns/1', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('characterApi', () => {
    const token = 'test-token';

    it('should list characters', async () => {
      const mockCharacters = [{ id: 1, name: 'Hero 1' }];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCharacters,
      });

      const result = await characterApi.list(token);

      expect(global.fetch).toHaveBeenCalledWith('/api/characters', {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(result).toEqual(mockCharacters);
    });

    it('should create a character', async () => {
      const mockCharacter = { id: 1, name: 'New Hero' };
      const charData = { name: 'New Hero', race: 'Human', class: 'Warrior' };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCharacter,
      });

      const result = await characterApi.create(token, charData);

      expect(global.fetch).toHaveBeenCalledWith('/api/characters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(charData),
      });
      expect(result).toEqual(mockCharacter);
    });
  });

  describe('assetApi', () => {
    const token = 'test-token';

    it('should list assets with filters', async () => {
      const mockAssets = [{ id: 1, filename: 'image.jpg' }];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAssets,
      });

      const result = await assetApi.list(token, { campaignId: '1', fileType: 'image' });

      expect(global.fetch).toHaveBeenCalledWith('/api/assets?campaignId=1&fileType=image', {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(result).toEqual(mockAssets);
    });

    it('should list assets without filters', async () => {
      const mockAssets = [{ id: 1, filename: 'image.jpg' }];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAssets,
      });

      const result = await assetApi.list(token);

      expect(global.fetch).toHaveBeenCalledWith('/api/assets', {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(result).toEqual(mockAssets);
    });
  });
});
