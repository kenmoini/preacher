import { describe, it, expect } from 'vitest';
import { scheduledTaskRepo } from '../../db/repositories/scheduled-task.repo';

describe('scheduledTaskRepo', () => {
  describe('create', () => {
    it('creates a scheduled task', () => {
      const task = scheduledTaskRepo.create({
        type: 'notification',
        referenceId: 'notif-123',
        executeAt: '2030-01-01T00:00:00Z',
      });

      expect(task.id).toBeDefined();
      expect(task.type).toBe('notification');
      expect(task.reference_id).toBe('notif-123');
      expect(task.status).toBe('pending');
    });
  });

  describe('findById', () => {
    it('finds a task by ID', () => {
      const task = scheduledTaskRepo.create({
        type: 'action',
        referenceId: 'act-123',
        executeAt: '2030-01-01T00:00:00Z',
      });

      const found = scheduledTaskRepo.findById(task.id);
      expect(found).toBeDefined();
      expect(found!.type).toBe('action');
    });

    it('returns undefined for non-existent ID', () => {
      expect(scheduledTaskRepo.findById('fake')).toBeUndefined();
    });
  });

  describe('findPending', () => {
    it('returns tasks that are due', () => {
      // Create a task in the past (should be returned)
      scheduledTaskRepo.create({
        type: 'notification',
        referenceId: 'past-task',
        executeAt: '2020-01-01T00:00:00Z',
      });

      // Create a task in the future (should not be returned)
      scheduledTaskRepo.create({
        type: 'notification',
        referenceId: 'future-task',
        executeAt: '2099-01-01T00:00:00Z',
      });

      const pending = scheduledTaskRepo.findPending();
      expect(pending).toHaveLength(1);
      expect(pending[0].reference_id).toBe('past-task');
    });

    it('does not return non-pending tasks', () => {
      const task = scheduledTaskRepo.create({
        type: 'notification',
        referenceId: 'done-task',
        executeAt: '2020-01-01T00:00:00Z',
      });
      scheduledTaskRepo.updateStatus(task.id, 'completed');

      expect(scheduledTaskRepo.findPending()).toHaveLength(0);
    });
  });

  describe('updateStatus', () => {
    it('updates status without result', () => {
      const task = scheduledTaskRepo.create({
        type: 'action',
        referenceId: 'ref',
        executeAt: '2030-01-01T00:00:00Z',
      });

      scheduledTaskRepo.updateStatus(task.id, 'executing');
      const updated = scheduledTaskRepo.findById(task.id);
      expect(updated!.status).toBe('executing');
      expect(updated!.result).toBeNull();
    });

    it('updates status with result', () => {
      const task = scheduledTaskRepo.create({
        type: 'action',
        referenceId: 'ref',
        executeAt: '2030-01-01T00:00:00Z',
      });

      scheduledTaskRepo.updateStatus(task.id, 'completed', 'Success!');
      const updated = scheduledTaskRepo.findById(task.id);
      expect(updated!.status).toBe('completed');
      expect(updated!.result).toBe('Success!');
    });
  });

  describe('cancel', () => {
    it('cancels a pending task', () => {
      const task = scheduledTaskRepo.create({
        type: 'notification',
        referenceId: 'ref',
        executeAt: '2030-01-01T00:00:00Z',
      });

      expect(scheduledTaskRepo.cancel(task.id)).toBe(true);
      const updated = scheduledTaskRepo.findById(task.id);
      expect(updated!.status).toBe('cancelled');
    });

    it('cannot cancel a non-pending task', () => {
      const task = scheduledTaskRepo.create({
        type: 'notification',
        referenceId: 'ref',
        executeAt: '2030-01-01T00:00:00Z',
      });

      scheduledTaskRepo.updateStatus(task.id, 'completed');
      expect(scheduledTaskRepo.cancel(task.id)).toBe(false);
    });

    it('returns false for non-existent task', () => {
      expect(scheduledTaskRepo.cancel('fake')).toBe(false);
    });
  });
});
