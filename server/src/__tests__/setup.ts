import { vi } from 'vitest';

// Mock the electron module before any imports that use it
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/tmp/test'),
  },
}));

// Mock the APNs service to avoid real network calls
vi.mock('../services/apns.service', () => {
  const mockApnsService = {
    isInitialized: vi.fn(() => false),
    initialize: vi.fn(),
    sendNotification: vi.fn(),
    sendSilent: vi.fn(),
    sendToDevices: vi.fn(async () => ({ sent: 0, failed: 0 })),
    sendTest: vi.fn(),
  };
  return {
    getApnsService: vi.fn(() => mockApnsService),
    ApnsService: vi.fn(() => mockApnsService),
  };
});

// Mock the WebSocket service
vi.mock('../services/websocket.service', () => ({
  getWebSocketService: vi.fn(() => null),
  initWebSocketService: vi.fn(),
  WebSocketService: vi.fn(),
}));

// Mock the scheduler
vi.mock('../services/scheduler.service', () => ({
  startScheduler: vi.fn(),
  stopScheduler: vi.fn(),
}));

// Suppress winston logging during tests
vi.mock('../services/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { initDatabase, closeDatabase } from '../db/index';

// Initialize in-memory database before all tests
beforeEach(() => {
  initDatabase(':memory:');
});

// Close the database after each test to ensure clean state
afterEach(() => {
  closeDatabase();
});
