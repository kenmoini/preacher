import { Router } from 'express';
import { z } from 'zod';
import { actionRepo } from '../../db/repositories/action.repo';
import { authMiddleware } from '../middleware/auth';

const router = Router();

const CreateActionSchema = z.object({
  name: z.string().min(1).max(100),
  shortcutName: z.string().optional(),
  targetDeviceId: z.string().uuid().optional(),
  homekitScene: z.string().optional(),
  webhookUrl: z.string().url().optional(),
  timeoutSeconds: z.number().min(1).max(300).optional(),
});

const UpdateActionSchema = CreateActionSchema.partial();

// List all server actions
router.get('/actions', authMiddleware, (_req, res) => {
  const actions = actionRepo.findAll();
  res.json(actions.map(a => ({
    id: a.id,
    name: a.name,
    shortcutName: a.shortcut_name,
    targetDeviceId: a.target_device_id,
    homekitScene: a.homekit_scene,
    webhookUrl: a.webhook_url,
    timeoutSeconds: a.timeout_seconds,
    createdAt: a.created_at,
  })));
});

// Create a server action
router.post('/actions', authMiddleware, (req, res) => {
  const data = CreateActionSchema.parse(req.body);

  const existing = actionRepo.findByName(data.name);
  if (existing) {
    res.status(409).json({ error: `Action '${data.name}' already exists` });
    return;
  }

  const action = actionRepo.create(data);
  res.status(201).json({
    id: action.id,
    name: action.name,
    createdAt: action.created_at,
  });
});

// Update a server action
router.put('/actions/:id', authMiddleware, (req, res) => {
  const data = UpdateActionSchema.parse(req.body);
  const id = req.params.id as string;
  const action = actionRepo.update(id, data);

  if (!action) {
    res.status(404).json({ error: 'Action not found' });
    return;
  }

  res.json({
    id: action.id,
    name: action.name,
  });
});

// Delete a server action
router.delete('/actions/:id', authMiddleware, (req, res) => {
  const id = req.params.id as string;
  const deleted = actionRepo.delete(id);
  if (!deleted) {
    res.status(404).json({ error: 'Action not found' });
    return;
  }
  res.status(204).send();
});

export default router;
