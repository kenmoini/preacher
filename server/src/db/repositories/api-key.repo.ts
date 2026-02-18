import { getDatabase } from '../index';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'node:crypto';

export interface ApiKeyRow {
  id: string;
  name: string;
  key_hash: string;
  key_prefix: string;
  permissions: string;
  is_active: number;
  last_used_at: string | null;
  created_at: string;
}

function hashKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export const apiKeyRepo = {
  findAll(): ApiKeyRow[] {
    return getDatabase().prepare('SELECT * FROM api_keys ORDER BY created_at DESC').all() as ApiKeyRow[];
  },

  findById(id: string): ApiKeyRow | undefined {
    return getDatabase().prepare('SELECT * FROM api_keys WHERE id = ?').get(id) as ApiKeyRow | undefined;
  },

  findByKeyHash(keyHash: string): ApiKeyRow | undefined {
    return getDatabase().prepare('SELECT * FROM api_keys WHERE key_hash = ? AND is_active = 1').get(keyHash) as ApiKeyRow | undefined;
  },

  validateKey(key: string): ApiKeyRow | undefined {
    const hash = hashKey(key);
    return this.findByKeyHash(hash);
  },

  create(data: { name: string; permissions?: string[] }): { apiKey: ApiKeyRow; rawKey: string } {
    const id = uuidv4();
    const rawKey = `pk_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = hashKey(rawKey);
    const keyPrefix = rawKey.substring(0, 10);
    const permissions = JSON.stringify(data.permissions ?? ['*']);

    getDatabase().prepare(`
      INSERT INTO api_keys (id, name, key_hash, key_prefix, permissions)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, data.name, keyHash, keyPrefix, permissions);

    const apiKey = this.findById(id)!;
    return { apiKey, rawKey };
  },

  updateLastUsed(id: string): void {
    getDatabase().prepare("UPDATE api_keys SET last_used_at = datetime('now') WHERE id = ?").run(id);
  },

  revoke(id: string): boolean {
    const result = getDatabase().prepare('UPDATE api_keys SET is_active = 0 WHERE id = ?').run(id);
    return result.changes > 0;
  },

  delete(id: string): boolean {
    const result = getDatabase().prepare('DELETE FROM api_keys WHERE id = ?').run(id);
    return result.changes > 0;
  },
};
