import { getDatabase } from '../index';
import { v4 as uuidv4 } from 'uuid';

export interface NotificationDefinitionRow {
  id: string;
  name: string;
  title: string | null;
  text: string | null;
  sound: string;
  image_url: string | null;
  is_time_sensitive: number;
  default_action: string | null;
  actions: string | null;
  thread_id: string | null;
  target_devices: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationLogRow {
  id: string;
  definition_id: string | null;
  title: string | null;
  text: string | null;
  payload: string;
  target_devices: string;
  status: string;
  scheduled_for: string | null;
  sent_at: string | null;
  error: string | null;
  created_at: string;
}

export const notificationDefinitionRepo = {
  findAll(): NotificationDefinitionRow[] {
    return getDatabase().prepare('SELECT * FROM notification_definitions ORDER BY created_at DESC').all() as NotificationDefinitionRow[];
  },

  findById(id: string): NotificationDefinitionRow | undefined {
    return getDatabase().prepare('SELECT * FROM notification_definitions WHERE id = ?').get(id) as NotificationDefinitionRow | undefined;
  },

  findByName(name: string): NotificationDefinitionRow | undefined {
    return getDatabase().prepare('SELECT * FROM notification_definitions WHERE name = ?').get(name) as NotificationDefinitionRow | undefined;
  },

  create(data: {
    name: string;
    title?: string;
    text?: string;
    sound?: string;
    imageUrl?: string;
    isTimeSensitive?: boolean;
    defaultAction?: object;
    actions?: object[];
    threadId?: string;
    targetDevices?: string[];
  }): NotificationDefinitionRow {
    const id = uuidv4();
    getDatabase().prepare(`
      INSERT INTO notification_definitions (id, name, title, text, sound, image_url, is_time_sensitive, default_action, actions, thread_id, target_devices)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.name,
      data.title ?? null,
      data.text ?? null,
      data.sound ?? 'system',
      data.imageUrl ?? null,
      data.isTimeSensitive ? 1 : 0,
      data.defaultAction ? JSON.stringify(data.defaultAction) : null,
      data.actions ? JSON.stringify(data.actions) : null,
      data.threadId ?? null,
      data.targetDevices ? JSON.stringify(data.targetDevices) : null,
    );
    return this.findById(id)!;
  },

  update(id: string, data: Partial<{
    name: string;
    title: string | null;
    text: string | null;
    sound: string;
    imageUrl: string | null;
    isTimeSensitive: boolean;
    defaultAction: object | null;
    actions: object[] | null;
    threadId: string | null;
    targetDevices: string[] | null;
  }>): NotificationDefinitionRow | undefined {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
    if (data.text !== undefined) { fields.push('text = ?'); values.push(data.text); }
    if (data.sound !== undefined) { fields.push('sound = ?'); values.push(data.sound); }
    if (data.imageUrl !== undefined) { fields.push('image_url = ?'); values.push(data.imageUrl); }
    if (data.isTimeSensitive !== undefined) { fields.push('is_time_sensitive = ?'); values.push(data.isTimeSensitive ? 1 : 0); }
    if (data.defaultAction !== undefined) { fields.push('default_action = ?'); values.push(data.defaultAction ? JSON.stringify(data.defaultAction) : null); }
    if (data.actions !== undefined) { fields.push('actions = ?'); values.push(data.actions ? JSON.stringify(data.actions) : null); }
    if (data.threadId !== undefined) { fields.push('thread_id = ?'); values.push(data.threadId); }
    if (data.targetDevices !== undefined) { fields.push('target_devices = ?'); values.push(data.targetDevices ? JSON.stringify(data.targetDevices) : null); }

    if (fields.length === 0) return this.findById(id);

    fields.push("updated_at = datetime('now')");
    values.push(id);

    getDatabase().prepare(`UPDATE notification_definitions SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.findById(id);
  },

  delete(id: string): boolean {
    const result = getDatabase().prepare('DELETE FROM notification_definitions WHERE id = ?').run(id);
    return result.changes > 0;
  },
};

export const notificationLogRepo = {
  findAll(limit = 50, offset = 0): NotificationLogRow[] {
    return getDatabase().prepare('SELECT * FROM notification_log ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset) as NotificationLogRow[];
  },

  findById(id: string): NotificationLogRow | undefined {
    return getDatabase().prepare('SELECT * FROM notification_log WHERE id = ?').get(id) as NotificationLogRow | undefined;
  },

  count(): number {
    const row = getDatabase().prepare('SELECT COUNT(*) as count FROM notification_log').get() as { count: number };
    return row.count;
  },

  create(data: {
    definitionId?: string;
    title?: string;
    text?: string;
    payload: object;
    targetDevices: string[];
    status?: string;
    scheduledFor?: string;
  }): NotificationLogRow {
    const id = uuidv4();
    getDatabase().prepare(`
      INSERT INTO notification_log (id, definition_id, title, text, payload, target_devices, status, scheduled_for)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.definitionId ?? null,
      data.title ?? null,
      data.text ?? null,
      JSON.stringify(data.payload),
      JSON.stringify(data.targetDevices),
      data.status ?? 'pending',
      data.scheduledFor ?? null,
    );
    return this.findById(id)!;
  },

  updateStatus(id: string, status: string, error?: string): void {
    if (status === 'sent') {
      getDatabase().prepare("UPDATE notification_log SET status = ?, sent_at = datetime('now') WHERE id = ?").run(status, id);
    } else if (error) {
      getDatabase().prepare('UPDATE notification_log SET status = ?, error = ? WHERE id = ?').run(status, error, id);
    } else {
      getDatabase().prepare('UPDATE notification_log SET status = ? WHERE id = ?').run(status, id);
    }
  },
};
