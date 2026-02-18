import { Router } from 'express';
import { APP_NAME, APP_VERSION } from '../../shared/constants';

const router = Router();

const startTime = Date.now();

router.get('/health', (_req, res) => {
  res.json({
    name: APP_NAME,
    version: APP_VERSION,
    status: 'ok',
    uptime: Math.floor((Date.now() - startTime) / 1000),
  });
});

export default router;
