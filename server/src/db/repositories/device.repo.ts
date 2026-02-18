import { getDatabase } from '../index';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'node:crypto';

export interface DeviceRow {
  id: string;
  name: string;
  apns_token: string;
  platform: string;
  is_automation_server: number;
  last_seen_at: string | null;
  registration_token: string;
  created_at: string;
  updated_at: string;
}

export const deviceRepo = {
  findAll(): DeviceRow[] {
    return getDatabase().prepare('SELECT * FROM devices ORDER BY created_at DESC').all() as DeviceRow[];
  },

  findById(id: string): DeviceRow | undefined {
    return getDatabase().prepare('SELECT * FROM devices WHERE id = ?').get(id) as DeviceRow | undefined;
  },

  findByName(name: string): DeviceRow | undefined {
    return getDatabase().prepare('SELECT * FROM devices WHERE name = ?').get(name) as DeviceRow | undefined;
  },

  findByNames(names: string[]): DeviceRow[] {
    if (names.length === 0) return [];
    const placeholders = names.map(() => '?').join(',');
    return getDatabase().prepare(`SELECT * FROM devices WHERE name IN (${placeholders})`).all(...names) as DeviceRow[];
  },

  findByApnsToken(token: string): DeviceRow | undefined {
    return getDatabase().prepare('SELECT * FROM devices WHERE apns_token = ?').get(token) as DeviceRow | undefined;
  },

  findByRegistrationToken(token: string): DeviceRow | undefined {
    return getDatabase().prepare('SELECT * FROM devices WHERE registration_token = ?').get(token) as DeviceRow | undefined;
  },

  findAutomationServers(): DeviceRow[] {
    return getDatabase().prepare('SELECT * FROM devices WHERE is_automation_server = 1').all() as DeviceRow[];
  },

  create(data: { name: string; apnsToken: string; platform: string }): { device: DeviceRow; registrationToken: string } {
    const id = uuidv4();
    const registrationToken = crypto.randomBytes(32).toString('hex');

    getDatabase().prepare(`
      INSERT INTO devices (id, name, apns_token, platform, registration_token)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, data.name, data.apnsToken, data.platform, registrationToken);

    const device = this.findById(id)!;
    return { device, registrationToken };
  },

  update(id: string, data: Partial<{ name: string; apnsToken: string; isAutomationServer: boolean }>): DeviceRow | undefined {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.apnsToken !== undefined) { fields.push('apns_token = ?'); values.push(data.apnsToken); }
    if (data.isAutomationServer !== undefined) { fields.push('is_automation_server = ?'); values.push(data.isAutomationServer ? 1 : 0); }

    if (fields.length === 0) return this.findById(id);

    fields.push("updated_at = datetime('now')");
    values.push(id);

    getDatabase().prepare(`UPDATE devices SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.findById(id);
  },

  updateLastSeen(id: string): void {
    getDatabase().prepare("UPDATE devices SET last_seen_at = datetime('now') WHERE id = ?").run(id);
  },

  delete(id: string): boolean {
    const result = getDatabase().prepare('DELETE FROM devices WHERE id = ?').run(id);
    return result.changes > 0;
  },
};
