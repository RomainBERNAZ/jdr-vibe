import { describe, it, expect, beforeEach, vi } from 'vitest';
import { register, login } from '../../server/controllers/authController.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Mock dependencies
vi.mock('../../server/config/db.js', () => ({
  default: {
    query: vi.fn(),
  },
}));

vi.mock('bcryptjs');
vi.mock('jsonwebtoken');

import pool from '../../server/config/db.js';

describe('Auth Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const req = {
        body: {
          email: 'test@example.com',
          password: 'password123',
        },
      };
      const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      };

      bcrypt.hash.mockResolvedValue('hashed_password');
      pool.query.mockResolvedValue({
        rows: [{ id: 1, email: 'test@example.com' }],
      });

      await register(req, res);

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(pool.query).toHaveBeenCalledWith(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
        ['test@example.com', 'hashed_password']
      );
      expect(res.json).toHaveBeenCalledWith({ id: 1, email: 'test@example.com' });
    });

    it('should return error on registration failure', async () => {
      const req = {
        body: {
          email: 'test@example.com',
          password: 'password123',
        },
      };
      const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      };

      const error = new Error('Database error');
      bcrypt.hash.mockResolvedValue('hashed_password');
      pool.query.mockRejectedValue(error);

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Database error' });
    });
  });

  describe('login', () => {
    it('should login user with valid credentials', async () => {
      const req = {
        body: {
          email: 'test@example.com',
          password: 'password123',
        },
      };
      const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      };

      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password_hash: 'hashed_password',
      };

      pool.query.mockResolvedValue({ rows: [mockUser] });
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('mock_jwt_token');

      await login(req, res);

      expect(pool.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE email = $1',
        ['test@example.com']
      );
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashed_password');
      expect(jwt.sign).toHaveBeenCalledWith(
        { id: 1, email: 'test@example.com' },
        process.env.JWT_SECRET
      );
      expect(res.json).toHaveBeenCalledWith({
        token: 'mock_jwt_token',
        user: { id: 1, email: 'test@example.com' },
      });
    });

    it('should return 400 if user not found', async () => {
      const req = {
        body: {
          email: 'test@example.com',
          password: 'password123',
        },
      };
      const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      };

      pool.query.mockResolvedValue({ rows: [] });

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
    });

    it('should return 403 if password is wrong', async () => {
      const req = {
        body: {
          email: 'test@example.com',
          password: 'wrongpassword',
        },
      };
      const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      };

      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password_hash: 'hashed_password',
      };

      pool.query.mockResolvedValue({ rows: [mockUser] });
      bcrypt.compare.mockResolvedValue(false);

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Wrong password' });
    });
  });
});
