import assert from 'node:assert/strict';
import test from 'node:test';
import { validate } from '../middleware/validate.js';
import {
  addPlayerSchema,
  campaignIdSchema,
  campaignSessionSchema,
  createCampaignSchema,
  credentialsSchema,
  updateCampaignSchema
} from '../validation/schemas.js';

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

const runValidation = (schema, value, source = 'body') => {
  const req = { [source]: value };
  const res = createResponse();
  let nextCalled = false;
  validate(schema, source)(req, res, () => { nextCalled = true; });
  return { req, res, nextCalled };
};

test('normalizes a valid email and rejects a short password', () => {
  const valid = runValidation(credentialsSchema, {
    email: '  PLAYER@Example.test ',
    password: 'long-enough-password'
  });
  const invalid = runValidation(credentialsSchema, {
    email: 'player@example.test',
    password: 'short'
  });

  assert.equal(valid.nextCalled, true);
  assert.equal(valid.req.body.email, 'player@example.test');
  assert.equal(invalid.nextCalled, false);
  assert.equal(invalid.res.statusCode, 400);
});

test('defaults campaign system and rejects unknown fields', () => {
  const valid = createCampaignSchema.safeParse({ name: '  Aventure  ' });
  const invalid = createCampaignSchema.safeParse({ name: 'Aventure', isAdmin: true });

  assert.equal(valid.success, true);
  assert.deepEqual(valid.data, { name: 'Aventure', system: 'D&D 5e' });
  assert.equal(invalid.success, false);
});

test('rejects empty or invalid campaign updates', () => {
  assert.equal(updateCampaignSchema.safeParse({}).success, false);
  assert.equal(updateCampaignSchema.safeParse({ status: 'deleted' }).success, false);
  assert.equal(updateCampaignSchema.safeParse({ name: 'Updated' }).success, true);
});

test('validates campaign ids and player emails', () => {
  assert.equal(campaignIdSchema.safeParse({ id: '12' }).success, true);
  assert.equal(campaignIdSchema.safeParse({ id: '../12' }).success, false);
  assert.equal(addPlayerSchema.safeParse({ email: 'valid@example.test' }).success, true);
  assert.equal(addPlayerSchema.safeParse({ email: 'invalid' }).success, false);
});

test('caps persisted conversation size and accepts character sheets', () => {
  const valid = campaignSessionSchema.safeParse({
    conversation: [{ type: 'user', text: 'Bonjour' }],
    summary: '',
    characterSheet: { name: 'Ariane', level: 1 }
  });
  const invalid = campaignSessionSchema.safeParse({
    conversation: Array.from({ length: 1001 }, () => ({ type: 'user', text: 'x' })),
    summary: '',
    characterSheet: null
  });

  assert.equal(valid.success, true);
  assert.equal(invalid.success, false);
});