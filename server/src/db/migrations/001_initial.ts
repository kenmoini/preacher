import type Database from 'better-sqlite3';

export function runMigrations(db: Database.Database): void {
  // Create migrations tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const applied = db.prepare('SELECT name FROM _migrations').all() as { name: string }[];
  const appliedSet = new Set(applied.map(m => m.name));

  if (!appliedSet.has('001_initial')) {
    db.transaction(() => {
      db.exec(MIGRATION_001);
      db.prepare('INSERT INTO _migrations (name) VALUES (?)').run('001_initial');
    })();
  }
}

const MIGRATION_001 = `
  -- Devices registered with the server
  CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    apns_token TEXT NOT NULL UNIQUE,
    platform TEXT NOT NULL DEFAULT 'ios',
    is_automation_server INTEGER NOT NULL DEFAULT 0,
    last_seen_at TEXT,
    registration_token TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- API keys for authentication
  CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    key_prefix TEXT NOT NULL,
    permissions TEXT NOT NULL DEFAULT '["*"]',
    is_active INTEGER NOT NULL DEFAULT 1,
    last_used_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Notification definitions (templates)
  CREATE TABLE IF NOT EXISTS notification_definitions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    title TEXT,
    text TEXT,
    sound TEXT DEFAULT 'system',
    image_url TEXT,
    is_time_sensitive INTEGER NOT NULL DEFAULT 0,
    default_action TEXT,
    actions TEXT,
    thread_id TEXT,
    target_devices TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Notification log (sent notifications)
  CREATE TABLE IF NOT EXISTS notification_log (
    id TEXT PRIMARY KEY,
    definition_id TEXT,
    title TEXT,
    text TEXT,
    payload TEXT NOT NULL,
    target_devices TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    scheduled_for TEXT,
    sent_at TEXT,
    error TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (definition_id) REFERENCES notification_definitions(id) ON DELETE SET NULL
  );

  -- Server actions (shortcuts/automations)
  CREATE TABLE IF NOT EXISTS server_actions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    shortcut_name TEXT,
    target_device_id TEXT,
    homekit_scene TEXT,
    webhook_url TEXT,
    timeout_seconds INTEGER DEFAULT 30,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (target_device_id) REFERENCES devices(id) ON DELETE SET NULL
  );

  -- Scheduled tasks
  CREATE TABLE IF NOT EXISTS scheduled_tasks (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    reference_id TEXT NOT NULL,
    execute_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    result TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- APNs configuration (singleton)
  CREATE TABLE IF NOT EXISTS apns_config (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    key_path TEXT NOT NULL,
    key_id TEXT NOT NULL,
    team_id TEXT NOT NULL,
    bundle_id TEXT NOT NULL,
    is_production INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Indexes
  CREATE INDEX IF NOT EXISTS idx_devices_apns_token ON devices(apns_token);
  CREATE INDEX IF NOT EXISTS idx_devices_name ON devices(name);
  CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
  CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);
  CREATE INDEX IF NOT EXISTS idx_notification_definitions_name ON notification_definitions(name);
  CREATE INDEX IF NOT EXISTS idx_notification_log_status ON notification_log(status);
  CREATE INDEX IF NOT EXISTS idx_notification_log_created ON notification_log(created_at);
  CREATE INDEX IF NOT EXISTS idx_server_actions_name ON server_actions(name);
  CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_status_execute ON scheduled_tasks(status, execute_at);
`;
