import { getDatabase } from '../index';
import { v4 as uuidv4 } from 'uuid';

export interface ServerActionRow {
  id: string;
  name: string;
  shortcut_name: string | null;
  target_device_id: string | null;
  homekit_scene: string | null;
  webhook_url: string | null;
  timeout_seconds: number;
  created_at: string;
}

export const actionRepo = {
  findAll(): ServerActionRow[] {
    return getDatabase().prepare('SELECT * FROM server_actions ORDER BY created_at DESC').all() as ServerActionRow[];
  },

  findById(id: string): ServerActionRow | undefined {
    return getDatabase().prepare('SELECT * FROM server_actions WHERE id = ?').get(id) as ServerActionRow | undefined;
  },

  findByName(name: string): ServerActionRow | undefined {
    return getDatabase().prepare('SELECT * FROM server_actions WHERE name = ?').get(name) as ServerActionRow | undefined;
  },

  create(data: {
    name: string;
    shortcutName?: string;
    targetDeviceId?: string;
    homekitScene?: string;
    webhookUrl?: string;
    timeoutSeconds?: number;
  }): ServerActionRow {
    const id = uuidv4();
    getDatabase().prepare(`
      INSERT INTO server_actions (id, name, shortcut_name, target_device_id, homekit_scene, webhook_url, timeout_seconds)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.name,
      data.shortcutName ?? null,
      data.targetDeviceId ?? null,
      data.homekitScene ?? null,
      data.webhookUrl ?? null,
      data.timeoutSeconds ?? 30,
    );
    return this.findById(id)!;
  },

  update(id: string, data: Partial<{
    name: string;
    shortcutName: string | null;
    targetDeviceId: string | null;
    homekitScene: string | null;
    webhookUrl: string | null;
    timeoutSeconds: number;
  }>): ServerActionRow | undefined {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.shortcutName !== undefined) { fields.push('shortcut_name = ?'); values.push(data.shortcutName); }
    if (data.targetDeviceId !== undefined) { fields.push('target_device_id = ?'); values.push(data.targetDeviceId); }
    if (data.homekitScene !== undefined) { fields.push('homekit_scene = ?'); values.push(data.homekitScene); }
    if (data.webhookUrl !== undefined) { fields.push('webhook_url = ?'); values.push(data.webhookUrl); }
    if (data.timeoutSeconds !== undefined) { fields.push('timeout_seconds = ?'); values.push(data.timeoutSeconds); }

    if (fields.length === 0) return this.findById(id);
    values.push(id);

    getDatabase().prepare(`UPDATE server_actions SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.findById(id);
  },

  delete(id: string): boolean {
    const result = getDatabase().prepare('DELETE FROM server_actions WHERE id = ?').run(id);
    return result.changes > 0;
  },
};
