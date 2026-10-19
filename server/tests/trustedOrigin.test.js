import assert from 'node:assert/strict';
import test from 'node:test';
import { requireTrustedOrigin } from '../middleware/trustedOrigin.js';

const createRequest = (origin, host = 'app.example.test') => ({
  protocol: 'https',
  get(name) {
    if (name === 'origin') return origin;
    if (name === 'host') return host;
    return undefined;
  }
});

const createResponse = () => ({
  statusCode: 200,
  body: undefined,
  status(statusCode) {
    this.statusCode = statusCode;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  }
});

test('allows the same origin and configured development origins', () => {
  const originalOrigins = process.env.CORS_ORIGINS;
  const originalNodeEnv = process.env.NODE_ENV;
  delete process.env.CORS_ORIGINS;
  delete process.env.NODE_ENV;

  try {
    for (const origin of ['https://app.example.test', 'http://localhost:5173']) {
      const res = createResponse();
      let nextCalled = false;
      requireTrustedOrigin(createRequest(origin), res, () => { nextCalled = true; });
      assert.equal(nextCalled, true);
    }
  } finally {
    if (originalOrigins === undefined) delete process.env.CORS_ORIGINS;
    else process.env.CORS_ORIGINS = originalOrigins;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  }
});

test('rejects a cross-origin state-changing request from an unknown origin', () => {
  const originalOrigins = process.env.CORS_ORIGINS;
  process.env.CORS_ORIGINS = 'https://app.example.test';
  const res = createResponse();
  let nextCalled = false;

  try {
    requireTrustedOrigin(createRequest('https://attacker.example'), res, () => { nextCalled = true; });
  } finally {
    if (originalOrigins === undefined) delete process.env.CORS_ORIGINS;
    else process.env.CORS_ORIGINS = originalOrigins;
  }

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
});

test('allows non-browser clients that do not send an Origin header', () => {
  const res = createResponse();
  let nextCalled = false;

  requireTrustedOrigin(createRequest(undefined), res, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
});