import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import http from 'node:http';
import { createApiRouter } from '../api/router';
import { errorHandler } from '../api/middleware/error-handler';
import { initDatabase, closeDatabase, getDatabase } from '../db/index';
import { getApnsService } from '../services/apns.service';
import { initWebSocketService } from '../services/websocket.service';
import { startScheduler, stopScheduler } from '../services/scheduler.service';
import { logger } from '../services/logger';
import { DEFAULT_PORT, APP_NAME, APP_VERSION } from '../shared/constants';

let httpServer: http.Server | null = null;

export async function startServer(port = DEFAULT_PORT, dbPath?: string): Promise<http.Server> {
  // Initialize database
  initDatabase(dbPath);

  // Create Express app
  const app = express();

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(morgan('short', {
    stream: { write: (msg: string) => logger.info(msg.trim()) },
  }));

  // Mount API routes
  app.use('/api/v1', createApiRouter());

  // Error handler
  app.use(errorHandler);

  // Create HTTP server
  httpServer = http.createServer(app);

  // Initialize WebSocket server on the same HTTP server
  initWebSocketService(httpServer);

  // Load APNs config from database if available
  try {
    const row = getDatabase().prepare('SELECT * FROM apns_config WHERE id = 1').get() as {
      key_path: string;
      key_id: string;
      team_id: string;
      bundle_id: string;
      is_production: number;
    } | undefined;

    if (row) {
      getApnsService().initialize({
        keyPath: row.key_path,
        keyId: row.key_id,
        teamId: row.team_id,
        bundleId: row.bundle_id,
        isProduction: !!row.is_production,
      });
    }
  } catch (err) {
    logger.warn('No APNs config found, will need to be configured via dashboard');
  }

  // Start scheduler
  startScheduler();

  return new Promise((resolve) => {
    httpServer!.listen(port, () => {
      logger.info(`${APP_NAME} v${APP_VERSION} listening on port ${port}`);
      resolve(httpServer!);
    });
  });
}

export function stopServer(): void {
  stopScheduler();
  if (httpServer) {
    httpServer.close();
    httpServer = null;
  }
  closeDatabase();
}

export function getHttpServer(): http.Server | null {
  return httpServer;
}
