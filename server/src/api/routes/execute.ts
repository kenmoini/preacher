import { Router } from 'express';
import { z } from 'zod';
import { actionRepo } from '../../db/repositories/action.repo';
import { scheduledTaskRepo } from '../../db/repositories/scheduled-task.repo';
import { authMiddleware } from '../middleware/auth';
import { getActionService } from '../../services/action.service';

const router = Router();

const ExecuteSchema = z.object({
  action: z.string().optional(),
  shortcut: z.string().optional(),
  input: z.string().optional(),
  delay: z.number().min(0).optional(),
  timeout: z.number().min(1).max(300).optional(),
  nowait: z.boolean().optional(),
}).refine(data => data.action || data.shortcut, {
  message: 'Either action or shortcut must be provided',
});

// Execute a server action
router.post('/execute', authMiddleware, async (req, res) => {
  const data = ExecuteSchema.parse(req.body);

  // Resolve the action
  let shortcutName = data.shortcut;
  let targetDeviceId: string | null = null;
  let webhookUrl: string | null = null;
  let timeout = data.timeout ?? 30;

  if (data.action) {
    const action = actionRepo.findByName(data.action);
    if (!action) {
      res.status(404).json({ error: `Action '${data.action}' not found` });
      return;
    }
    shortcutName = action.shortcut_name ?? undefined;
    targetDeviceId = action.target_device_id;
    webhookUrl = action.webhook_url;
    timeout = data.timeout ?? action.timeout_seconds;
  }

  if (!shortcutName && !webhookUrl) {
    res.status(400).json({ error: 'No shortcut or webhook configured for this action' });
    return;
  }

  // Handle delayed execution
  if (data.delay && data.delay > 0) {
    const executeAt = new Date(Date.now() + data.delay * 1000).toISOString();
    const task = scheduledTaskRepo.create({
      type: 'action',
      referenceId: JSON.stringify({ shortcutName, targetDeviceId, webhookUrl, input: data.input }),
      executeAt,
    });

    res.status(202).json({
      id: task.id,
      status: 'scheduled',
      executeAt: task.execute_at,
    });
    return;
  }

  // Immediate execution
  if (data.nowait) {
    // Fire and forget - catch errors to prevent unhandled rejections
    getActionService()
      .execute({ shortcutName: shortcutName!, targetDeviceId, webhookUrl, input: data.input, timeout })
      .catch(() => {}); // errors are logged inside the service
    res.status(202).json({ status: 'accepted' });
    return;
  }

  try {
    const result = await getActionService().execute({
      shortcutName: shortcutName!,
      targetDeviceId,
      webhookUrl,
      input: data.input,
      timeout,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Execution failed' });
  }
});

// Cancel a scheduled execution
router.delete('/execute/:id', authMiddleware, (req, res) => {
  const id = req.params.id as string;
  const cancelled = scheduledTaskRepo.cancel(id);
  if (!cancelled) {
    res.status(404).json({ error: 'Scheduled task not found or already executed' });
    return;
  }
  res.json({ status: 'cancelled' });
});

export default router;
