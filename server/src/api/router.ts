import { Router } from 'express';
import healthRoutes from './routes/health';
import deviceRoutes from './routes/devices';
import apiKeyRoutes from './routes/api-keys';
import notificationRoutes from './routes/notifications';
import actionRoutes from './routes/actions';
import executeRoutes from './routes/execute';
import logRoutes from './routes/log';
import configRoutes from './routes/config';

export function createApiRouter(): Router {
  const router = Router();

  // Mount all route modules under /api/v1
  router.use(healthRoutes);
  router.use(deviceRoutes);
  router.use(apiKeyRoutes);
  router.use(notificationRoutes);
  router.use(actionRoutes);
  router.use(executeRoutes);
  router.use(logRoutes);
  router.use(configRoutes);

  return router;
}
