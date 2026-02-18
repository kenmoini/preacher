import { describe, it, expect } from 'vitest';
import { notificationDefinitionRepo, notificationLogRepo } from '../../db/repositories/notification.repo';

describe('notificationDefinitionRepo', () => {
  describe('create', () => {
    it('creates a notification definition', () => {
      const def = notificationDefinitionRepo.create({
        name: 'welcome',
        title: 'Welcome!',
        text: 'Hello there',
      });

      expect(def.id).toBeDefined();
      expect(def.name).toBe('welcome');
      expect(def.title).toBe('Welcome!');
      expect(def.text).toBe('Hello there');
      expect(def.sound).toBe('system'); // default
      expect(def.is_time_sensitive).toBe(0);
    });

    it('stores JSON fields correctly', () => {
      const def = notificationDefinitionRepo.create({
        name: 'with-actions',
        title: 'Test',
        defaultAction: { name: 'Open', url: 'https://example.com' },
        actions: [{ name: 'View', url: 'https://example.com' }],
        targetDevices: ['iPhone', 'iPad'],
      });

      expect(JSON.parse(def.default_action!)).toEqual({ name: 'Open', url: 'https://example.com' });
      expect(JSON.parse(def.actions!)).toHaveLength(1);
      expect(JSON.parse(def.target_devices!)).toEqual(['iPhone', 'iPad']);
    });
  });

  describe('findByName', () => {
    it('finds definition by name', () => {
      notificationDefinitionRepo.create({ name: 'alert', title: 'Alert!' });
      const found = notificationDefinitionRepo.findByName('alert');

      expect(found).toBeDefined();
      expect(found!.title).toBe('Alert!');
    });

    it('returns undefined for non-existent name', () => {
      expect(notificationDefinitionRepo.findByName('nope')).toBeUndefined();
    });
  });

  describe('update', () => {
    it('updates selected fields', () => {
      const def = notificationDefinitionRepo.create({ name: 'test', title: 'Old' });
      const updated = notificationDefinitionRepo.update(def.id, { title: 'New' });

      expect(updated!.title).toBe('New');
      expect(updated!.name).toBe('test'); // unchanged
    });

    it('returns existing definition when no fields provided', () => {
      const def = notificationDefinitionRepo.create({ name: 'test' });
      const result = notificationDefinitionRepo.update(def.id, {});
      expect(result).toBeDefined();
    });

    it('returns undefined for non-existent ID', () => {
      expect(notificationDefinitionRepo.update('fake', { title: 'X' })).toBeUndefined();
    });
  });

  describe('delete', () => {
    it('deletes the definition', () => {
      const def = notificationDefinitionRepo.create({ name: 'to-delete' });
      expect(notificationDefinitionRepo.delete(def.id)).toBe(true);
      expect(notificationDefinitionRepo.findById(def.id)).toBeUndefined();
    });

    it('returns false for non-existent ID', () => {
      expect(notificationDefinitionRepo.delete('fake')).toBe(false);
    });
  });
});

describe('notificationLogRepo', () => {
  describe('create', () => {
    it('creates a log entry', () => {
      const entry = notificationLogRepo.create({
        title: 'Test',
        text: 'Body',
        payload: { title: 'Test', text: 'Body' },
        targetDevices: ['device-1'],
      });

      expect(entry.id).toBeDefined();
      expect(entry.title).toBe('Test');
      expect(entry.status).toBe('pending');
      expect(JSON.parse(entry.target_devices)).toEqual(['device-1']);
    });

    it('stores scheduled entries', () => {
      const entry = notificationLogRepo.create({
        title: 'Scheduled',
        payload: { title: 'Scheduled' },
        targetDevices: [],
        status: 'scheduled',
        scheduledFor: '2030-01-01T00:00:00Z',
      });

      expect(entry.status).toBe('scheduled');
      expect(entry.scheduled_for).toBe('2030-01-01T00:00:00Z');
    });
  });

  describe('findAll', () => {
    it('respects limit and offset', () => {
      for (let i = 0; i < 5; i++) {
        notificationLogRepo.create({
          title: `Notification ${i}`,
          payload: { title: `Notification ${i}` },
          targetDevices: [],
        });
      }

      expect(notificationLogRepo.findAll(2, 0)).toHaveLength(2);
      expect(notificationLogRepo.findAll(2, 3)).toHaveLength(2);
      expect(notificationLogRepo.findAll(50, 10)).toHaveLength(0);
    });
  });

  describe('count', () => {
    it('returns the total count', () => {
      expect(notificationLogRepo.count()).toBe(0);

      notificationLogRepo.create({ title: 'A', payload: {}, targetDevices: [] });
      notificationLogRepo.create({ title: 'B', payload: {}, targetDevices: [] });

      expect(notificationLogRepo.count()).toBe(2);
    });
  });

  describe('updateStatus', () => {
    it('updates status to sent and sets sent_at', () => {
      const entry = notificationLogRepo.create({
        title: 'Test',
        payload: {},
        targetDevices: [],
      });

      notificationLogRepo.updateStatus(entry.id, 'sent');
      const updated = notificationLogRepo.findById(entry.id);

      expect(updated!.status).toBe('sent');
      expect(updated!.sent_at).not.toBeNull();
    });

    it('updates status to failed with error', () => {
      const entry = notificationLogRepo.create({
        title: 'Test',
        payload: {},
        targetDevices: [],
      });

      notificationLogRepo.updateStatus(entry.id, 'failed', 'Connection timeout');
      const updated = notificationLogRepo.findById(entry.id);

      expect(updated!.status).toBe('failed');
      expect(updated!.error).toBe('Connection timeout');
    });
  });
});
