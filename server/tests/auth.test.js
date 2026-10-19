import assert from 'node:assert/strict';
import test from 'node:test';
import jwt from 'jsonwebtoken';
import { authenticateToken } from '../middleware/auth.js';

const jwtSecret = 'test-jwt-secret';
process.env.JWT_SECRET = jwtSecret;

const createResponse = () => ({
  statusCode: 200,
  sendStatus(statusCode) {
    this.statusCode = statusCode;
    return this;
  }
});

test('rejects a request without a bearer token', () => {
  const req = { headers: {} };
  const res = createResponse();
  let nextCalled = false;

  authenticateToken(req, res, () => { nextCalled = true; });

  assert.equal(res.statusCode, 401);
  assert.equal(nextCalled, false);
});

test('rejects an invalid bearer token', () => {
  const req = { headers: { authorization: 'Bearer invalid-token' } };
  const res = createResponse();
  let nextCalled = false;

  authenticateToken(req, res, () => { nextCalled = true; });

  assert.equal(res.statusCode, 403);
  assert.equal(nextCalled, false);
});

test('attaches the verified user to the request', () => {
  const token = jwt.sign({ id: 7, email: 'player@example.test' }, jwtSecret, { issuer: 'aether-rpg' });
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = createResponse();
  let nextCalled = false;

  authenticateToken(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
  assert.equal(req.user.id, 7);
  assert.equal(req.user.email, 'player@example.test');
});

test('accepts the HttpOnly access token cookie', () => {
  const token = jwt.sign({ id: 7, email: 'player@example.test' }, jwtSecret, { issuer: 'aether-rpg' });
  const req = { headers: {}, cookies: { accessToken: token } };
  const res = createResponse();
  let nextCalled = false;

  authenticateToken(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
  assert.equal(req.user.id, 7);
});