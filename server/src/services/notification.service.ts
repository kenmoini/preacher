import { deviceRepo } from '../db/repositories/device.repo';
import { notificationLogRepo, type NotificationLogRow } from '../db/repositories/notification.repo';
import { scheduledTaskRepo } from '../db/repositories/scheduled-task.repo';
import type { NotificationDefinitionRow } from '../db/repositories/notification.repo';
import type { NotificationPayload } from '../api/validators/notification';
import { getApnsService } from './apns.service';
import { getWebSocketService } from './websocket.service';
import { logger } from './logger';

let instance: NotificationService | null = null;

export function getNotificationService(): NotificationService {
  if (!instance) {
    instance = new NotificationService();
  }
  return instance;
}

export class NotificationService {

  async sendFromDefinition(
    definition: NotificationDefinitionRow,
    overrides: NotificationPayload,
  ): Promise<NotificationLogRow> {
    // Merge definition defaults with overrides
    const payload: NotificationPayload = {
      title: overrides.title ?? definition.title ?? undefined,
      text: overrides.text ?? definition.text ?? undefined,
      sound: overrides.sound ?? (definition.sound as NotificationPayload['sound']) ?? 'system',
      image: overrides.image ?? definition.image_url ?? undefined,
      isTimeSensitive: overrides.isTimeSensitive ?? !!definition.is_time_sensitive,
      threadId: overrides.threadId ?? definition.thread_id ?? undefined,
      devices: overrides.devices ?? (definition.target_devices ? JSON.parse(definition.target_devices) : undefined),
      defaultAction: overrides.defaultAction ?? (definition.default_action ? JSON.parse(definition.default_action) : undefined),
      actions: overrides.actions ?? (definition.actions ? JSON.parse(definition.actions) : undefined),
      input: overrides.input,
      delay: overrides.delay,
      scheduleTimestamp: overrides.scheduleTimestamp,
      id: overrides.id,
      imageData: overrides.imageData,
    };

    return this.send(payload, definition.id);
  }

  async sendAdHoc(payload: NotificationPayload): Promise<NotificationLogRow> {
    return this.send(payload);
  }

  private async send(payload: NotificationPayload, definitionId?: string): Promise<NotificationLogRow> {
    // Resolve target devices
    const targetDeviceIds = await this.resolveTargetDevices(payload.devices);

    // Handle scheduling
    if (payload.delay && payload.delay > 0) {
      return this.scheduleNotification(payload, targetDeviceIds, definitionId, payload.delay);
    }
    if (payload.scheduleTimestamp) {
      const delayMs = payload.scheduleTimestamp * 1000 - Date.now();
      if (delayMs > 0) {
        return this.scheduleNotification(payload, targetDeviceIds, definitionId, delayMs / 1000);
      }
    }

    // Create log entry
    const logEntry = notificationLogRepo.create({
      definitionId,
      title: payload.title,
      text: payload.text,
      payload,
      targetDevices: targetDeviceIds,
      status: 'pending',
    });

    // Send via APNs
    try {
      const apns = getApnsService();
      if (apns.isInitialized()) {
        const result = await apns.sendToDevices(targetDeviceIds, {
          title: payload.title,
          text: payload.text,
          sound: payload.sound,
          threadId: payload.threadId,
          isTimeSensitive: payload.isTimeSensitive,
          image: payload.image,
          customData: {
            notificationId: logEntry.id,
            actions: payload.actions,
            defaultAction: payload.defaultAction,
            input: payload.input,
            threadId: payload.threadId,
          },
        });
        logger.info('Notification sent via APNs', { sent: result.sent, failed: result.failed });
      }

      // Also send via WebSocket for real-time in-app delivery
      const wsService = getWebSocketService();
      if (wsService) {
        for (const deviceId of targetDeviceIds) {
          wsService.sendToDevice(deviceId, {
            type: 'notification',
            payload,
          });
        }
      }

      notificationLogRepo.updateStatus(logEntry.id, 'sent');
    } catch (err) {
      logger.error('Failed to send notification', { error: (err as Error).message });
      notificationLogRepo.updateStatus(logEntry.id, 'failed', (err as Error).message);
    }

    return notificationLogRepo.findById(logEntry.id)!;
  }

  private async scheduleNotification(
    payload: NotificationPayload,
    targetDeviceIds: string[],
    definitionId: string | undefined,
    delaySeconds: number,
  ): Promise<NotificationLogRow> {
    const executeAt = new Date(Date.now() + delaySeconds * 1000).toISOString();

    const logEntry = notificationLogRepo.create({
      definitionId,
      title: payload.title,
      text: payload.text,
      payload,
      targetDevices: targetDeviceIds,
      status: 'scheduled',
      scheduledFor: executeAt,
    });

    scheduledTaskRepo.create({
      type: 'notification',
      referenceId: logEntry.id,
      executeAt,
    });

    return logEntry;
  }

  private async resolveTargetDevices(deviceNames?: string[]): Promise<string[]> {
    if (deviceNames && deviceNames.length > 0) {
      const devices = deviceRepo.findByNames(deviceNames);
      return devices.map(d => d.id);
    }
    // Send to all devices
    const allDevices = deviceRepo.findAll();
    return allDevices.map(d => d.id);
  }

  async executeScheduledNotification(logEntryId: string): Promise<void> {
    const logEntry = notificationLogRepo.findById(logEntryId);
    if (!logEntry || logEntry.status !== 'scheduled') return;

    const payload = JSON.parse(logEntry.payload) as NotificationPayload;
    const targetDeviceIds = JSON.parse(logEntry.target_devices) as string[];

    try {
      const apns = getApnsService();
      if (apns.isInitialized()) {
        await apns.sendToDevices(targetDeviceIds, {
          title: payload.title,
          text: payload.text,
          sound: payload.sound,
          threadId: payload.threadId,
          isTimeSensitive: payload.isTimeSensitive,
          image: payload.image,
          customData: {
            notificationId: logEntry.id,
            actions: payload.actions,
            defaultAction: payload.defaultAction,
            input: payload.input,
          },
        });
      }

      notificationLogRepo.updateStatus(logEntryId, 'sent');
    } catch (err) {
      notificationLogRepo.updateStatus(logEntryId, 'failed', (err as Error).message);
    }
  }
}
