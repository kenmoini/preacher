import { Router } from 'express';
import { notificationLogRepo } from '../../db/repositories/notification.repo';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Get notification log (paginated)
router.get('/log', authMiddleware, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const offset = parseInt(req.query.offset as string) || 0;

  const entries = notificationLogRepo.findAll(limit, offset);
  const total = notificationLogRepo.count();

  res.json({
    entries: entries.map(e => ({
      id: e.id,
      definitionId: e.definition_id,
      title: e.title,
      text: e.text,
      targetDevices: JSON.parse(e.target_devices),
      status: e.status,
      scheduledFor: e.scheduled_for,
      sentAt: e.sent_at,
      error: e.error,
      createdAt: e.created_at,
    })),
    total,
    limit,
    offset,
  });
});

export default router;
