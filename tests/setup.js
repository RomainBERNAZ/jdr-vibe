import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock environment variables for tests
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.OPENAI_API_KEY = 'test-openai-key';
