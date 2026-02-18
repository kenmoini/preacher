// Shared types between main process, renderer, and API

// --- Device ---
export interface Device {
  id: string;
  name: string;
  apnsToken: string;
  platform: string;
  isAutomationServer: boolean;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// --- API Key ---
export interface ApiKey {
  id: string;
  name: string;
  keyHash: string;
  permissions: string[];
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

// --- Notification ---
export interface NotificationAction {
  name: string;
  input?: string;
  keepNotification?: boolean;
  shortcut?: string;
  homekit?: string;
  runOnServer?: boolean;
  url?: string;
  urlBackgroundOptions?: {
    httpMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    httpContentType?: string;
    httpBody?: string;
  };
}

export interface NotificationPayload {
  title?: string;
  text?: string;
  sound?: 'vibrateOnly' | 'system' | 'subtle' | 'question' | 'jobDone' | 'problem' | 'loud' | 'lasers';
  image?: string;
  imageData?: string;
  input?: string;
  devices?: string[];
  isTimeSensitive?: boolean;
  delay?: number;
  scheduleTimestamp?: number;
  id?: string;
  threadId?: string;
  defaultAction?: NotificationAction;
  actions?: NotificationAction[];
}

export interface NotificationDefinition {
  id: string;
  name: string;
  title: string | null;
  text: string | null;
  sound: string;
  imageUrl: string | null;
  isTimeSensitive: boolean;
  defaultAction: NotificationAction | null;
  actions: NotificationAction[];
  threadId: string | null;
  targetDevices: string[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationLogEntry {
  id: string;
  definitionId: string | null;
  title: string | null;
  text: string | null;
  payload: string;
  targetDevices: string[];
  status: 'pending' | 'sent' | 'failed' | 'scheduled';
  scheduledFor: string | null;
  sentAt: string | null;
  error: string | null;
  createdAt: string;
}

// --- Server Action ---
export interface ServerAction {
  id: string;
  name: string;
  shortcutName: string | null;
  targetDeviceId: string | null;
  homekitScene: string | null;
  webhookUrl: string | null;
  timeoutSeconds: number;
  createdAt: string;
}

// --- Scheduled Task ---
export interface ScheduledTask {
  id: string;
  type: 'notification' | 'action';
  referenceId: string;
  executeAt: string;
  status: 'pending' | 'executing' | 'completed' | 'cancelled' | 'failed';
  result: string | null;
  createdAt: string;
}

// --- APNs Config ---
export interface ApnsConfig {
  keyPath: string;
  keyId: string;
  teamId: string;
  bundleId: string;
  isProduction: boolean;
}

// --- WebSocket Messages ---
export type WSClientMessage =
  | { type: 'auth'; token: string }
  | { type: 'pong' }
  | { type: 'execute_result'; id: string; success: boolean; output?: string; error?: string }
  | { type: 'status'; automationServerReady: boolean };

export type WSServerMessage =
  | { type: 'auth_ok'; deviceId: string }
  | { type: 'auth_error'; reason: string }
  | { type: 'ping' }
  | { type: 'execute_shortcut'; id: string; shortcutName: string; input?: string }
  | { type: 'cancel_execution'; id: string }
  | { type: 'notification'; payload: NotificationPayload };

// --- Server Status ---
export interface ServerStatus {
  running: boolean;
  port: number;
  version: string;
  uptime: number;
  connectedDevices: number;
}
