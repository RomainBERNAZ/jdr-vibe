import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pruneUploads } from '../utils/audioCleanup.js';

test('prunes stale audio files and preserves recent or unrelated files', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'jdr-audio-cleanup-'));
  const now = Date.now();
  const staleAudio = path.join(directory, 'audio-old.webm');
  const recentAudio = path.join(directory, 'audio-recent.webm');
  const unrelatedFile = path.join(directory, 'notes.txt');

  try {
    await Promise.all([
      fs.writeFile(staleAudio, 'old audio'),
      fs.writeFile(recentAudio, 'recent audio'),
      fs.writeFile(unrelatedFile, 'keep')
    ]);
    await fs.utimes(staleAudio, new Date(now - 120_000), new Date(now - 120_000));
    await fs.utimes(recentAudio, new Date(now - 1_000), new Date(now - 1_000));
    await fs.utimes(unrelatedFile, new Date(now - 120_000), new Date(now - 120_000));

    const removed = await pruneUploads(directory, { maxAgeMs: 60_000, now });

    assert.equal(removed, 1);
    assert.deepEqual((await fs.readdir(directory)).sort(), ['audio-recent.webm', 'notes.txt']);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});