import { v4 as uuidv4 } from 'uuid';
import { deviceRepo } from '../db/repositories/device.repo';
import { getWebSocketService } from './websocket.service';
import { getApnsService } from './apns.service';
import { logger } from './logger';

let instance: ActionService | null = null;

export function getActionService(): ActionService {
  if (!instance) {
    instance = new ActionService();
  }
  return instance;
}

export class ActionService {

  async execute(params: {
    shortcutName: string;
    targetDeviceId: string | null;
    webhookUrl: string | null;
    input?: string;
    timeout: number;
  }): Promise<{ success: boolean; output?: string; error?: string }> {
    const { shortcutName, targetDeviceId, webhookUrl, input, timeout } = params;

    // If there's a webhook, call it
    if (webhookUrl) {
      return this.executeWebhook(webhookUrl, input);
    }

    // Find the target automation server device
    const deviceId = targetDeviceId ?? this.findAutomationServer();
    if (!deviceId) {
      throw new Error('No automation server device available');
    }

    const executionId = uuidv4();

    // Try WebSocket first (faster, more reliable for connected devices)
    const wsService = getWebSocketService();
    if (wsService && wsService.isDeviceConnected(deviceId)) {
      try {
        return await wsService.executeOnDevice(deviceId, executionId, shortcutName, input, timeout * 1000);
      } catch (err) {
        logger.warn('WebSocket execution failed, falling back to APNs', { error: (err as Error).message });
      }
    }

    // Fallback to APNs silent push
    const apnsService = getApnsService();
    if (apnsService.isInitialized()) {
      const device = deviceRepo.findById(deviceId);
      if (!device) {
        throw new Error('Target device not found');
      }

      await apnsService.sendSilent(device.apns_token, {
        command: {
          type: 'execute_shortcut',
          id: executionId,
          shortcutName,
          input,
        },
      });

      // With APNs, we can't wait for a result
      return { success: true, output: 'Sent via APNs (no result available)' };
    }

    throw new Error('Cannot reach device: not connected via WebSocket and APNs not configured');
  }

  private async executeWebhook(url: string, input?: string): Promise<{ success: boolean; output?: string; error?: string }> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      });

      const text = await response.text();
      return {
        success: response.ok,
        output: text,
        error: response.ok ? undefined : `HTTP ${response.status}`,
      };
    } catch (err) {
      return {
        success: false,
        error: (err as Error).message,
      };
    }
  }

  private findAutomationServer(): string | null {
    const servers = deviceRepo.findAutomationServers();

    // Prefer connected devices
    const wsService = getWebSocketService();
    if (wsService) {
      for (const server of servers) {
        if (wsService.isDeviceConnected(server.id)) {
          return server.id;
        }
      }
    }

    // Return first automation server even if not connected (will use APNs)
    return servers[0]?.id ?? null;
  }
}
