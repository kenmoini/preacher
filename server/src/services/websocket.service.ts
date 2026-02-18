import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'node:http';
import { deviceRepo } from '../db/repositories/device.repo';
import { logger } from './logger';
import type { WSClientMessage, WSServerMessage } from '../shared/types';

let instance: WebSocketService | null = null;

export function getWebSocketService(): WebSocketService | null {
  return instance;
}

export function initWebSocketService(httpServer: Server): WebSocketService {
  instance = new WebSocketService(httpServer);
  return instance;
}

interface ConnectedDevice {
  ws: WebSocket;
  deviceId: string;
  lastPing: number;
}

export class WebSocketService {
  private wss: WebSocketServer;
  private connectedDevices = new Map<string, ConnectedDevice>();
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  // Callbacks for action execution results
  private pendingExecutions = new Map<string, {
    resolve: (result: { success: boolean; output?: string; error?: string }) => void;
    timeout: ReturnType<typeof setTimeout>;
  }>();

  constructor(httpServer: Server) {
    this.wss = new WebSocketServer({ server: httpServer, path: '/ws' });

    this.wss.on('connection', (ws) => {
      let authenticated = false;
      let deviceId: string | null = null;

      // Auth timeout - disconnect if not authenticated within 10 seconds
      const authTimeout = setTimeout(() => {
        if (!authenticated) {
          ws.close(4001, 'Authentication timeout');
        }
      }, 10000);

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString()) as WSClientMessage;
          this.handleMessage(ws, message, {
            isAuthenticated: () => authenticated,
            setAuthenticated: (id: string) => { authenticated = true; deviceId = id; clearTimeout(authTimeout); },
            getDeviceId: () => deviceId,
          });
        } catch (err) {
          logger.warn('Failed to parse WebSocket message', { error: (err as Error).message });
        }
      });

      ws.on('close', () => {
        clearTimeout(authTimeout);
        if (deviceId) {
          this.connectedDevices.delete(deviceId);
          logger.info('Device disconnected from WebSocket', { deviceId });
        }
      });

      ws.on('error', (err) => {
        logger.error('WebSocket error', { error: err.message, deviceId });
      });
    });

    // Ping connected devices every 30 seconds
    this.pingInterval = setInterval(() => {
      this.connectedDevices.forEach((device, id) => {
        if (Date.now() - device.lastPing > 60000) {
          // No pong for 60 seconds, consider disconnected
          device.ws.close();
          this.connectedDevices.delete(id);
          return;
        }
        this.send(device.ws, { type: 'ping' });
      });
    }, 30000);

    logger.info('WebSocket server started on /ws');
  }

  private handleMessage(
    ws: WebSocket,
    message: WSClientMessage,
    ctx: {
      isAuthenticated: () => boolean;
      setAuthenticated: (id: string) => void;
      getDeviceId: () => string | null;
    },
  ): void {
    switch (message.type) {
      case 'auth': {
        const device = deviceRepo.findByRegistrationToken(message.token);
        if (!device) {
          this.send(ws, { type: 'auth_error', reason: 'Invalid registration token' });
          ws.close(4002, 'Invalid token');
          return;
        }

        ctx.setAuthenticated(device.id);
        this.connectedDevices.set(device.id, { ws, deviceId: device.id, lastPing: Date.now() });
        deviceRepo.updateLastSeen(device.id);

        this.send(ws, { type: 'auth_ok', deviceId: device.id });
        logger.info('Device authenticated via WebSocket', { deviceId: device.id, name: device.name });
        break;
      }

      case 'pong': {
        const deviceId = ctx.getDeviceId();
        if (deviceId) {
          const device = this.connectedDevices.get(deviceId);
          if (device) {
            device.lastPing = Date.now();
          }
          deviceRepo.updateLastSeen(deviceId);
        }
        break;
      }

      case 'execute_result': {
        if (!ctx.isAuthenticated()) return;

        const pending = this.pendingExecutions.get(message.id);
        if (pending) {
          clearTimeout(pending.timeout);
          pending.resolve({
            success: message.success,
            output: message.output,
            error: message.error,
          });
          this.pendingExecutions.delete(message.id);
        }
        break;
      }

      case 'status': {
        if (!ctx.isAuthenticated()) return;
        const deviceId = ctx.getDeviceId();
        if (deviceId) {
          deviceRepo.update(deviceId, { isAutomationServer: message.automationServerReady });
        }
        break;
      }
    }
  }

  sendToDevice(deviceId: string, message: WSServerMessage): boolean {
    const device = this.connectedDevices.get(deviceId);
    if (!device || device.ws.readyState !== WebSocket.OPEN) {
      return false;
    }
    this.send(device.ws, message);
    return true;
  }

  async executeOnDevice(
    deviceId: string,
    executionId: string,
    shortcutName: string,
    input?: string,
    timeoutMs = 30000,
  ): Promise<{ success: boolean; output?: string; error?: string }> {
    const sent = this.sendToDevice(deviceId, {
      type: 'execute_shortcut',
      id: executionId,
      shortcutName,
      input,
    });

    if (!sent) {
      throw new Error('Device not connected via WebSocket');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingExecutions.delete(executionId);
        reject(new Error('Execution timed out'));
      }, timeoutMs);

      this.pendingExecutions.set(executionId, { resolve, timeout });
    });
  }

  isDeviceConnected(deviceId: string): boolean {
    const device = this.connectedDevices.get(deviceId);
    return !!device && device.ws.readyState === WebSocket.OPEN;
  }

  getConnectedDeviceIds(): string[] {
    return Array.from(this.connectedDevices.keys());
  }

  getConnectedCount(): number {
    return this.connectedDevices.size;
  }

  private send(ws: WebSocket, message: WSServerMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  shutdown(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    this.pendingExecutions.forEach(({ timeout }) => clearTimeout(timeout));
    this.wss.close();
  }
}
