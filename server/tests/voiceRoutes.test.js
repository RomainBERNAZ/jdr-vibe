import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { once } from 'node:events';
import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import jwt from 'jsonwebtoken';
import voiceRouter from '../routes/voiceRoutes.js';

const jwtSecret = 'voice-test-secret';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.resolve(__dirname, '../../uploads');
const app = express();
app.use('/api/voice', voiceRouter);

const server = app.listen(0, '127.0.0.1');
await once(server, 'listening');
const baseUrl = `http://127.0.0.1:${server.address().port}/api/voice/chat`;
let originalUploadFiles = new Set();

const createAudioForm = (audio = Buffer.from('test audio'), { includeTurnData = true } = {}) => {
  const form = new FormData();
  if (includeTurnData) {
    form.append('campaignId', '42');
    form.append('turnId', '9b7d2f4e-0e14-4c54-9ba7-11a9dc7e0581');
  }
  form.append('audio', new Blob([audio], { type: 'audio/webm' }), 'recording.webm');
  return form;
};

const authorization = () => `Bearer ${jwt.sign({ id: 7 }, jwtSecret, { issuer: 'aether-rpg' })}`;

before(async () => {
  process.env.JWT_SECRET = jwtSecret;
  delete process.env.OPENAI_API_KEY;
  await fs.mkdir(uploadsDir, { recursive: true });
  originalUploadFiles = new Set(await fs.readdir(uploadsDir));
});

after(async () => {
  server.close();
  server.closeAllConnections();
  await once(server, 'close');

  const files = await fs.readdir(uploadsDir);
  await Promise.all(files
    .filter((file) => !originalUploadFiles.has(file))
    .map((file) => fs.unlink(path.join(uploadsDir, file))));
});

test('rejects unauthenticated audio uploads before storing the file', async () => {
  const response = await fetch(baseUrl, {
    method: 'POST',
    body: createAudioForm()
  });

  assert.equal(response.status, 401);
  assert.deepEqual(await fs.readdir(uploadsDir), [...originalUploadFiles]);
});

test('rejects an audio upload larger than the configured limit', async () => {
  const oversizedAudio = Buffer.alloc(25 * 1024 * 1024 + 1);
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: { Authorization: authorization() },
    body: createAudioForm(oversizedAudio)
  });

  assert.equal(response.status, 413);
  assert.deepEqual(await fs.readdir(uploadsDir), [...originalUploadFiles]);
});

test('rejects an audio upload without campaign context and removes the temporary file', async () => {
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: { Authorization: authorization() },
    body: createAudioForm(Buffer.from('test audio'), { includeTurnData: false })
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await fs.readdir(uploadsDir), [...originalUploadFiles]);
});

test('removes the uploaded audio when OpenAI is not configured', async () => {
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: { Authorization: authorization() },
    body: createAudioForm()
  });

  assert.equal(response.status, 500);
  assert.deepEqual(await fs.readdir(uploadsDir), [...originalUploadFiles]);
});

test('limits authenticated voice requests', async () => {
  let rejected = false;

  for (let attempt = 0; attempt < 31; attempt += 1) {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { Authorization: authorization() }
    });
    if (response.status === 429) {
      rejected = true;
      break;
    }
    assert.equal(response.status, 400);
  }

  assert.equal(rejected, true);
});