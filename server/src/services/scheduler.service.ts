import cron from 'node-cron';
import { scheduledTaskRepo } from '../db/repositories/scheduled-task.repo';
import { getNotificationService } from './notification.service';
import { getActionService } from './action.service';
import { logger } from './logger';

let cronTask: cron.ScheduledTask | null = null;

export function startScheduler(): void {
  // Run every 10 seconds
  cronTask = cron.schedule('*/10 * * * * *', async () => {
    try {
      await processScheduledTasks();
    } catch (err) {
      logger.error('Scheduler error', { error: (err as Error).message });
    }
  });

  logger.info('Scheduler started (polling every 10 seconds)');
}

export function stopScheduler(): void {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
  }
}

async function processScheduledTasks(): Promise<void> {
  const tasks = scheduledTaskRepo.findPending();

  for (const task of tasks) {
    scheduledTaskRepo.updateStatus(task.id, 'executing');

    try {
      if (task.type === 'notification') {
        await getNotificationService().executeScheduledNotification(task.reference_id);
        scheduledTaskRepo.updateStatus(task.id, 'completed');
      } else if (task.type === 'action') {
        const actionData = JSON.parse(task.reference_id) as {
          shortcutName: string;
          targetDeviceId: string | null;
          webhookUrl: string | null;
          input?: string;
        };
        const result = await getActionService().execute({
          ...actionData,
          timeout: 30,
        });
        scheduledTaskRepo.updateStatus(task.id, 'completed', JSON.stringify(result));
      }
    } catch (err) {
      logger.error('Failed to execute scheduled task', { taskId: task.id, error: (err as Error).message });
      scheduledTaskRepo.updateStatus(task.id, 'failed', (err as Error).message);
    }
  }
}
