import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authenticateToken } from '../../server/middleware/auth.js';
import jwt from 'jsonwebtoken';

vi.mock('jsonwebtoken');

describe('Auth Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call next() when token is valid', () => {
    const req = {
      headers: {
        authorization: 'Bearer valid_token',
      },
    };
    const res = {};
    const next = vi.fn();

    jwt.verify.mockImplementation((token, secret, callback) => {
      callback(null, { id: 1, email: 'test@example.com' });
    });

    authenticateToken(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith(
      'valid_token',
      process.env.JWT_SECRET,
      expect.any(Function)
    );
    expect(req.user).toEqual({ id: 1, email: 'test@example.com' });
    expect(next).toHaveBeenCalled();
  });

  it('should return 401 when no token is provided', () => {
    const req = {
      headers: {},
    };
    const res = {
      sendStatus: vi.fn(),
    };
    const next = vi.fn();

    authenticateToken(req, res, next);

    expect(res.sendStatus).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 403 when token is invalid', () => {
    const req = {
      headers: {
        authorization: 'Bearer invalid_token',
      },
    };
    const res = {
      sendStatus: vi.fn(),
    };
    const next = vi.fn();

    jwt.verify.mockImplementation((token, secret, callback) => {
      callback(new Error('Invalid token'), null);
    });

    authenticateToken(req, res, next);

    expect(res.sendStatus).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('should extract token from Bearer format', () => {
    const req = {
      headers: {
        authorization: 'Bearer my_token_123',
      },
    };
    const res = {};
    const next = vi.fn();

    jwt.verify.mockImplementation((token, secret, callback) => {
      expect(token).toBe('my_token_123');
      callback(null, { id: 1, email: 'test@example.com' });
    });

    authenticateToken(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
