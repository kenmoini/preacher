import { Router } from 'express';
import { z } from 'zod';
import { getDatabase } from '../../db/index';
import { authMiddleware } from '../middleware/auth';
import { getApnsService } from '../../services/apns.service';

const router = Router();

const ApnsConfigSchema = z.object({
  keyPath: z.string().min(1),
  keyId: z.string().length(10),
  teamId: z.string().length(10),
  bundleId: z.string().min(1).regex(/^[a-zA-Z0-9.-]+$/),
  isProduction: z.boolean().optional(),
});

// Get APNs config (masked)
router.get('/config/apns', authMiddleware, (_req, res) => {
  const row = getDatabase().prepare('SELECT * FROM apns_config WHERE id = 1').get() as {
    key_path: string;
    key_id: string;
    team_id: string;
    bundle_id: string;
    is_production: number;
    updated_at: string;
  } | undefined;

  if (!row) {
    res.json({ configured: false });
    return;
  }

  res.json({
    configured: true,
    keyId: row.key_id,
    teamId: row.team_id,
    bundleId: row.bundle_id,
    isProduction: !!row.is_production,
    updatedAt: row.updated_at,
  });
});

// Update APNs config
router.put('/config/apns', authMiddleware, (req, res) => {
  const data = ApnsConfigSchema.parse(req.body);

  getDatabase().prepare(`
    INSERT INTO apns_config (id, key_path, key_id, team_id, bundle_id, is_production, updated_at)
    VALUES (1, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      key_path = excluded.key_path,
      key_id = excluded.key_id,
      team_id = excluded.team_id,
      bundle_id = excluded.bundle_id,
      is_production = excluded.is_production,
      updated_at = datetime('now')
  `).run(data.keyPath, data.keyId, data.teamId, data.bundleId, data.isProduction ? 1 : 0);

  // Re-initialize APNs client
  getApnsService().initialize({
    keyPath: data.keyPath,
    keyId: data.keyId,
    teamId: data.teamId,
    bundleId: data.bundleId,
    isProduction: data.isProduction ?? false,
  });

  res.json({ status: 'updated' });
});

// Send test notification
router.post('/config/apns/test', authMiddleware, async (req, res) => {
  const apnsService = getApnsService();
  if (!apnsService.isInitialized()) {
    res.status(400).json({ error: 'APNs not configured. Update APNs config first.' });
    return;
  }

  const deviceId = req.body.deviceId as string | undefined;
  if (!deviceId) {
    res.status(400).json({ error: 'deviceId is required to send a test notification' });
    return;
  }

  try {
    await apnsService.sendTest(deviceId);
    res.json({ status: 'sent' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

export default router;
