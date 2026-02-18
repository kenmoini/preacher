import express from 'express';
import { createApiRouter } from '../../api/router';
import { errorHandler } from '../../api/middleware/error-handler';
import { apiKeyRepo } from '../../db/repositories/api-key.repo';

/**
 * Creates a lightweight Express app for integration testing.
 * Does NOT start WebSocket, APNs, or scheduler - only the Express routes.
 */
export function createTestApp() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use('/api/v1', createApiRouter());
  app.use(errorHandler);
  return app;
}

/**
 * Creates an API key and returns the raw key for use in test Authorization headers.
 */
export function createTestApiKey(name = 'test-key'): string {
  const { rawKey } = apiKeyRepo.create({ name });
  return rawKey;
}
