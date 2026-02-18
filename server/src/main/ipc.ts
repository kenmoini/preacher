import { ipcMain, dialog } from 'electron';
import { getWebSocketService } from '../services/websocket.service';
import { getApnsService } from '../services/apns.service';
import { apiKeyRepo } from '../db/repositories/api-key.repo';
import { deviceRepo } from '../db/repositories/device.repo';
import { DEFAULT_PORT, APP_VERSION } from '../shared/constants';

export function registerIpcHandlers(serverPort: number): void {
  ipcMain.handle('select-p8-file', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select APNs Authentication Key',
      filters: [{ name: 'APNs Auth Key', extensions: ['p8'] }],
      properties: ['openFile'],
    });
    return result.filePaths[0] ?? null;
  });

  ipcMain.handle('get-server-url', () => {
    return `http://localhost:${serverPort}`;
  });

  ipcMain.handle('get-server-status', () => {
    const wsService = getWebSocketService();
    return {
      running: true,
      port: serverPort,
      version: APP_VERSION,
      connectedDevices: wsService?.getConnectedCount() ?? 0,
      apnsConfigured: getApnsService().isInitialized(),
      totalDevices: deviceRepo.findAll().length,
      totalApiKeys: apiKeyRepo.findAll().length,
    };
  });

  ipcMain.handle('create-initial-api-key', async (_event, name: string) => {
    const { apiKey, rawKey } = apiKeyRepo.create({ name });
    return {
      id: apiKey.id,
      name: apiKey.name,
      key: rawKey,
    };
  });
}
