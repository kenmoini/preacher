import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { startServer, stopServer } from './main/server';
import { registerIpcHandlers } from './main/ipc';
import { logger } from './services/logger';
import { DEFAULT_PORT } from './shared/constants';

if (started) {
  app.quit();
}

const serverPort = DEFAULT_PORT;

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Pulpit',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }
};

app.on('ready', async () => {
  // Register IPC handlers
  registerIpcHandlers(serverPort);

  // Start the Express + WebSocket server
  try {
    await startServer(serverPort);
    logger.info('Pulpit server started successfully');
  } catch (err) {
    logger.error('Failed to start server', { error: (err as Error).message });
  }

  // Create the Electron window
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  stopServer();
});
