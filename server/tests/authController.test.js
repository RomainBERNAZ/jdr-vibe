import assert from 'node:assert/strict';
import test from 'node:test';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createAuthHandlers } from '../controllers/authController.js';

const jwtSecret = 'test-jwt-secret-with-more-than-32-bytes';

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
  },
  cookie(name, value, options) {
    this.cookies ??= {};
    this.cookies[name] = { value, options };
    return this;
  }
});

test('registers an account with a bcrypt password hash', async () => {
  let insertedValues;
  const handlers = createAuthHandlers({
    database: {
      async query(_sql, values) {
        insertedValues = values;
        return { rows: [{ id: 11, email: values[0] }] };
      }
    },
    getJwtSecret: () => jwtSecret
  });
  const res = createResponse();

  await handlers.register({ body: { email: 'player@example.test', password: 'a-strong-password' } }, res);

  assert.equal(res.statusCode, 201);
  assert.equal(insertedValues[0], 'player@example.test');
  assert.notEqual(insertedValues[1], 'a-strong-password');
  assert.equal(await bcrypt.compare('a-strong-password', insertedValues[1]), true);
});

test('returns a conflict for an existing email without exposing database details', async () => {
  const handlers = createAuthHandlers({
    database: {
      async query() {
        throw Object.assign(new Error('duplicate key value'), { code: '23505' });
      }
    }
  });
  const res = createResponse();
  const originalError = console.error;
  console.error = () => {};

  try {
    await handlers.register({ body: { email: 'player@example.test', password: 'a-strong-password' } }, res);
  } finally {
    console.error = originalError;
  }

  assert.equal(res.statusCode, 409);
  assert.deepEqual(res.body, { error: 'An account already exists for this email' });
});

test('uses the same login error for unknown accounts and wrong passwords', async () => {
  const passwordHash = await bcrypt.hash('correct-password', 12);
  const handlers = createAuthHandlers({
    database: {
      async query(_sql, [email]) {
        return { rows: email === 'known@example.test' ? [{ id: 2, email, password_hash: passwordHash }] : [] };
      }
    },
    getJwtSecret: () => jwtSecret
  });
  const unknownResponse = createResponse();
  const wrongPasswordResponse = createResponse();

  await handlers.login({ body: { email: 'unknown@example.test', password: 'wrong-password' } }, unknownResponse);
  await handlers.login({ body: { email: 'known@example.test', password: 'wrong-password' } }, wrongPasswordResponse);

  assert.equal(unknownResponse.statusCode, 401);
  assert.deepEqual(unknownResponse.body, wrongPasswordResponse.body);
});

test('sets an HttpOnly SameSite cookie containing a seven-day JWT', async () => {
  const password = 'correct-password';
  const passwordHash = await bcrypt.hash(password, 12);
  const handlers = createAuthHandlers({
    database: {
      async query() {
        return { rows: [{ id: 2, email: 'player@example.test', password_hash: passwordHash }] };
      }
    },
    getJwtSecret: () => jwtSecret
  });
  const res = createResponse();

  await handlers.login({ body: { email: 'player@example.test', password } }, res);

  const cookie = res.cookies.accessToken;
  const payload = jwt.verify(cookie.value, jwtSecret, { issuer: 'aether-rpg', algorithms: ['HS256'] });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.token, undefined);
  assert.equal(cookie.options.httpOnly, true);
  assert.equal(cookie.options.sameSite, 'strict');
  assert.equal(cookie.options.path, '/api');
  assert.equal(payload.id, 2);
  assert.equal(payload.exp - payload.iat, 7 * 24 * 60 * 60);
});