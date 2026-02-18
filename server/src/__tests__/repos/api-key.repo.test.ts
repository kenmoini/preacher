import { describe, it, expect } from 'vitest';
import { apiKeyRepo } from '../../db/repositories/api-key.repo';

describe('apiKeyRepo', () => {
  describe('create', () => {
    it('creates an API key with pk_ prefix', () => {
      const { apiKey, rawKey } = apiKeyRepo.create({ name: 'Test Key' });

      expect(apiKey.id).toBeDefined();
      expect(apiKey.name).toBe('Test Key');
      expect(rawKey).toMatch(/^pk_[a-f0-9]{64}$/);
      expect(apiKey.key_prefix).toBe(rawKey.substring(0, 10));
      expect(apiKey.is_active).toBe(1);
    });

    it('defaults permissions to ["*"]', () => {
      const { apiKey } = apiKeyRepo.create({ name: 'Test Key' });
      expect(JSON.parse(apiKey.permissions)).toEqual(['*']);
    });

    it('stores custom permissions', () => {
      const { apiKey } = apiKeyRepo.create({ name: 'Limited', permissions: ['read', 'write'] });
      expect(JSON.parse(apiKey.permissions)).toEqual(['read', 'write']);
    });

    it('stores a SHA-256 hash, not the raw key', () => {
      const { apiKey, rawKey } = apiKeyRepo.create({ name: 'Test' });
      expect(apiKey.key_hash).not.toBe(rawKey);
      expect(apiKey.key_hash).toHaveLength(64); // SHA-256 hex
    });
  });

  describe('validateKey', () => {
    it('validates a correct key', () => {
      const { rawKey } = apiKeyRepo.create({ name: 'Test Key' });
      const found = apiKeyRepo.validateKey(rawKey);

      expect(found).toBeDefined();
      expect(found!.name).toBe('Test Key');
    });

    it('returns undefined for invalid key', () => {
      apiKeyRepo.create({ name: 'Test Key' });
      expect(apiKeyRepo.validateKey('pk_invalidkey')).toBeUndefined();
    });

    it('does not validate revoked keys', () => {
      const { apiKey, rawKey } = apiKeyRepo.create({ name: 'Test Key' });
      apiKeyRepo.revoke(apiKey.id);

      expect(apiKeyRepo.validateKey(rawKey)).toBeUndefined();
    });
  });

  describe('findAll', () => {
    it('returns empty array initially', () => {
      expect(apiKeyRepo.findAll()).toEqual([]);
    });

    it('returns all keys', () => {
      apiKeyRepo.create({ name: 'Key 1' });
      apiKeyRepo.create({ name: 'Key 2' });

      expect(apiKeyRepo.findAll()).toHaveLength(2);
    });
  });

  describe('findById', () => {
    it('finds a key by ID', () => {
      const { apiKey } = apiKeyRepo.create({ name: 'Test' });
      expect(apiKeyRepo.findById(apiKey.id)).toBeDefined();
    });

    it('returns undefined for non-existent ID', () => {
      expect(apiKeyRepo.findById('fake')).toBeUndefined();
    });
  });

  describe('updateLastUsed', () => {
    it('updates the last_used_at timestamp', () => {
      const { apiKey } = apiKeyRepo.create({ name: 'Test' });
      expect(apiKey.last_used_at).toBeNull();

      apiKeyRepo.updateLastUsed(apiKey.id);
      const updated = apiKeyRepo.findById(apiKey.id);
      expect(updated!.last_used_at).not.toBeNull();
    });
  });

  describe('revoke', () => {
    it('deactivates the key', () => {
      const { apiKey } = apiKeyRepo.create({ name: 'Test' });
      expect(apiKeyRepo.revoke(apiKey.id)).toBe(true);

      const found = apiKeyRepo.findById(apiKey.id);
      expect(found!.is_active).toBe(0);
    });

    it('returns false for non-existent key', () => {
      expect(apiKeyRepo.revoke('fake')).toBe(false);
    });
  });

  describe('delete', () => {
    it('removes the key completely', () => {
      const { apiKey } = apiKeyRepo.create({ name: 'Test' });
      expect(apiKeyRepo.delete(apiKey.id)).toBe(true);
      expect(apiKeyRepo.findById(apiKey.id)).toBeUndefined();
    });

    it('returns false for non-existent key', () => {
      expect(apiKeyRepo.delete('fake')).toBe(false);
    });
  });
});
