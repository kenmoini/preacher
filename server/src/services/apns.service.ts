import fs from 'node:fs';
import { ApnsClient, Notification, Errors } from 'apns2';
import { logger } from './logger';
import { deviceRepo } from '../db/repositories/device.repo';
import type { ApnsConfig } from '../shared/types';

let instance: ApnsService | null = null;

export function getApnsService(): ApnsService {
  if (!instance) {
    instance = new ApnsService();
  }
  return instance;
}

export class ApnsService {
  private client: ApnsClient | null = null;
  private bundleId: string = '';

  isInitialized(): boolean {
    return this.client !== null;
  }

  initialize(config: ApnsConfig): void {
    try {
      if (!fs.existsSync(config.keyPath)) {
        logger.error('APNs key file not found', { keyPath: config.keyPath });
        return;
      }

      const signingKey = fs.readFileSync(config.keyPath, 'utf8');

      this.client = new ApnsClient({
        team: config.teamId,
        keyId: config.keyId,
        signingKey,
        defaultTopic: config.bundleId,
        host: config.isProduction
          ? 'https://api.push.apple.com'
          : 'https://api.sandbox.push.apple.com',
      });

      this.bundleId = config.bundleId;

      this.client.on(Errors.error, (err) => {
        logger.error('APNs client error', { error: err.message });
      });

      this.client.on(Errors.badDeviceToken, (err) => {
        logger.warn('Bad device token detected', { error: err.message });
      });

      logger.info('APNs service initialized', {
        keyId: config.keyId,
        teamId: config.teamId,
        bundleId: config.bundleId,
        environment: config.isProduction ? 'production' : 'sandbox',
      });
    } catch (err) {
      logger.error('Failed to initialize APNs service', { error: (err as Error).message });
    }
  }

  async sendNotification(deviceToken: string, payload: {
    title?: string;
    text?: string;
    sound?: string;
    threadId?: string;
    isTimeSensitive?: boolean;
    image?: string;
    customData?: Record<string, unknown>;
  }): Promise<void> {
    if (!this.client) {
      throw new Error('APNs not initialized');
    }

    const notification = new Notification(deviceToken, {
      alert: {
        title: payload.title || '',
        body: payload.text || '',
      },
      sound: payload.sound === 'vibrateOnly' ? undefined : (payload.sound || 'default'),
      threadId: payload.threadId,
      topic: this.bundleId,
      aps: {
        'mutable-content': 1,
        'interruption-level': payload.isTimeSensitive ? 'time-sensitive' : 'active',
      },
      data: {
        preacher: payload.customData ?? {},
        ...(payload.image ? { image: payload.image } : {}),
      },
    });

    await this.client.send(notification);
  }

  async sendSilent(deviceToken: string, data: Record<string, unknown>): Promise<void> {
    if (!this.client) {
      throw new Error('APNs not initialized');
    }

    const notification = new Notification(deviceToken, {
      topic: this.bundleId,
      aps: {
        'content-available': 1,
      },
      data,
    });

    await this.client.send(notification);
  }

  async sendToDevices(deviceIds: string[], payload: {
    title?: string;
    text?: string;
    sound?: string;
    threadId?: string;
    isTimeSensitive?: boolean;
    image?: string;
    customData?: Record<string, unknown>;
  }): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const deviceId of deviceIds) {
      const device = deviceRepo.findById(deviceId);
      if (!device) {
        failed++;
        continue;
      }

      try {
        await this.sendNotification(device.apns_token, payload);
        sent++;
      } catch (err) {
        logger.error('Failed to send to device', { deviceId, error: (err as Error).message });
        failed++;
      }
    }

    return { sent, failed };
  }

  async sendTest(deviceId: string): Promise<void> {
    const device = deviceRepo.findById(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    await this.sendNotification(device.apns_token, {
      title: 'Pulpit Test',
      text: 'If you see this, APNs is working correctly!',
      sound: 'default',
    });
  }
}
