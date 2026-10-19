import fs from 'node:fs/promises';
import path from 'node:path';

export const pruneUploads = async (directory, { maxAgeMs = 24 * 60 * 60 * 1000, now = Date.now() } = {}) => {
  let entries;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return 0;
    throw error;
  }

  let removed = 0;
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.startsWith('audio-')) continue;
    const filePath = path.join(directory, entry.name);
    let stats;
    try {
      stats = await fs.stat(filePath);
    } catch (error) {
      if (error.code === 'ENOENT') continue;
      throw error;
    }
    if (stats.mtimeMs >= now - maxAgeMs) continue;
    await fs.unlink(filePath);
    removed += 1;
  }
  return removed;
};

export const startUploadCleanup = (directory, options) => {
  const timer = setInterval(() => {
    pruneUploads(directory, options).catch((error) => {
      console.error('Unable to prune stale audio uploads:', error);
    });
  }, 60 * 60 * 1000);
  timer.unref();
  return () => clearInterval(timer);
};