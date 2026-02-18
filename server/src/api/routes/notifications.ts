import { Router } from 'express';
import { NotificationPayloadSchema, NotificationDefinitionCreateSchema, NotificationDefinitionUpdateSchema } from '../validators/notification';
import { notificationDefinitionRepo } from '../../db/repositories/notification.repo';
import { authMiddleware } from '../middleware/auth';
import { getNotificationService } from '../../services/notification.service';

const router = Router();

// --- Notification definitions (templates) ---
// NOTE: These MUST come before /notifications/:name to avoid
// Express matching "definitions" as a :name parameter.

// List all definitions
router.get('/notifications/definitions', authMiddleware, (_req, res) => {
  const definitions = notificationDefinitionRepo.findAll();
  res.json(definitions.map(d => ({
    id: d.id,
    name: d.name,
    title: d.title,
    text: d.text,
    sound: d.sound,
    imageUrl: d.image_url,
    isTimeSensitive: !!d.is_time_sensitive,
    defaultAction: d.default_action ? JSON.parse(d.default_action) : null,
    actions: d.actions ? JSON.parse(d.actions) : [],
    threadId: d.thread_id,
    targetDevices: d.target_devices ? JSON.parse(d.target_devices) : null,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  })));
});

// Create a definition
router.post('/notifications/definitions', authMiddleware, (req, res) => {
  const data = NotificationDefinitionCreateSchema.parse(req.body);

  const existing = notificationDefinitionRepo.findByName(data.name);
  if (existing) {
    res.status(409).json({ error: `Notification definition '${data.name}' already exists` });
    return;
  }

  const definition = notificationDefinitionRepo.create(data);
  res.status(201).json({
    id: definition.id,
    name: definition.name,
    createdAt: definition.created_at,
  });
});

// Update a definition
router.put('/notifications/definitions/:id', authMiddleware, (req, res) => {
  const data = NotificationDefinitionUpdateSchema.parse(req.body);
  const id = req.params.id as string;
  const definition = notificationDefinitionRepo.update(id, data);

  if (!definition) {
    res.status(404).json({ error: 'Notification definition not found' });
    return;
  }

  res.json({
    id: definition.id,
    name: definition.name,
    updatedAt: definition.updated_at,
  });
});

// Delete a definition
router.delete('/notifications/definitions/:id', authMiddleware, (req, res) => {
  const id = req.params.id as string;
  const deleted = notificationDefinitionRepo.delete(id);
  if (!deleted) {
    res.status(404).json({ error: 'Notification definition not found' });
    return;
  }
  res.status(204).send();
});

// --- Send notifications ---

// Send ad-hoc notification (no template needed)
router.post('/notifications', authMiddleware, async (req, res) => {
  const payload = NotificationPayloadSchema.parse(req.body);

  if (!payload.title && !payload.text) {
    res.status(400).json({ error: 'At least one of title or text is required' });
    return;
  }

  try {
    const logEntry = await getNotificationService().sendAdHoc(payload);
    res.json({
      id: logEntry.id,
      status: logEntry.status,
      scheduledFor: logEntry.scheduled_for,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// Send notification by template name
router.post('/notifications/:name', authMiddleware, async (req, res) => {
  const definitionName = req.params.name as string;
  const overrides = NotificationPayloadSchema.parse(req.body);

  const definition = notificationDefinitionRepo.findByName(definitionName);
  if (!definition) {
    res.status(404).json({ error: `Notification definition '${definitionName}' not found` });
    return;
  }

  try {
    const logEntry = await getNotificationService().sendFromDefinition(definition, overrides);
    res.json({
      id: logEntry.id,
      status: logEntry.status,
      scheduledFor: logEntry.scheduled_for,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

export default router;
