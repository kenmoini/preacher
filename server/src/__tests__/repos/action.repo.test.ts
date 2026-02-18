import { describe, it, expect } from 'vitest';
import { actionRepo } from '../../db/repositories/action.repo';

describe('actionRepo', () => {
  describe('create', () => {
    it('creates a server action with defaults', () => {
      const action = actionRepo.create({ name: 'run-backup' });

      expect(action.id).toBeDefined();
      expect(action.name).toBe('run-backup');
      expect(action.shortcut_name).toBeNull();
      expect(action.target_device_id).toBeNull();
      expect(action.webhook_url).toBeNull();
      expect(action.timeout_seconds).toBe(30); // default
    });

    it('creates a fully specified action', () => {
      const action = actionRepo.create({
        name: 'deploy',
        shortcutName: 'Deploy Script',
        webhookUrl: 'https://example.com/deploy',
        timeoutSeconds: 120,
      });

      expect(action.shortcut_name).toBe('Deploy Script');
      expect(action.webhook_url).toBe('https://example.com/deploy');
      expect(action.timeout_seconds).toBe(120);
    });
  });

  describe('findByName', () => {
    it('finds an action by name', () => {
      actionRepo.create({ name: 'test-action' });
      const found = actionRepo.findByName('test-action');

      expect(found).toBeDefined();
      expect(found!.name).toBe('test-action');
    });

    it('returns undefined when not found', () => {
      expect(actionRepo.findByName('nonexistent')).toBeUndefined();
    });
  });

  describe('findAll', () => {
    it('returns all actions', () => {
      actionRepo.create({ name: 'action-1' });
      actionRepo.create({ name: 'action-2' });

      expect(actionRepo.findAll()).toHaveLength(2);
    });
  });

  describe('update', () => {
    it('updates specific fields', () => {
      const action = actionRepo.create({ name: 'original', timeoutSeconds: 10 });
      const updated = actionRepo.update(action.id, { name: 'renamed', timeoutSeconds: 60 });

      expect(updated!.name).toBe('renamed');
      expect(updated!.timeout_seconds).toBe(60);
    });

    it('returns undefined for non-existent ID', () => {
      expect(actionRepo.update('fake', { name: 'x' })).toBeUndefined();
    });

    it('returns existing action when no fields provided', () => {
      const action = actionRepo.create({ name: 'test' });
      const result = actionRepo.update(action.id, {});
      expect(result).toBeDefined();
      expect(result!.name).toBe('test');
    });
  });

  describe('delete', () => {
    it('deletes the action', () => {
      const action = actionRepo.create({ name: 'to-delete' });
      expect(actionRepo.delete(action.id)).toBe(true);
      expect(actionRepo.findById(action.id)).toBeUndefined();
    });

    it('returns false for non-existent ID', () => {
      expect(actionRepo.delete('fake')).toBe(false);
    });
  });
});
