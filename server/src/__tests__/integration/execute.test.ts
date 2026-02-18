import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createTestApp, createTestApiKey } from '../helpers/test-app';
import { actionRepo } from '../../db/repositories/action.repo';
import { scheduledTaskRepo } from '../../db/repositories/scheduled-task.repo';

describe('Execute API', () => {
  describe('POST /api/v1/execute', () => {
    it('requires either action or shortcut', async () => {
      const app = createTestApp();
      const apiKey = createTestApiKey();

      const res = await request(app)
        .post('/api/v1/execute')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ input: 'something' }); // no action or shortcut

      expect(res.status).toBe(400);
    });

    it('returns 404 when action not found', async () => {
      const app = createTestApp();
      const apiKey = createTestApiKey();

      const res = await request(app)
        .post('/api/v1/execute')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ action: 'nonexistent' });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('nonexistent');
    });

    it('returns 400 when action has no shortcut or webhook', async () => {
      const app = createTestApp();
      const apiKey = createTestApiKey();

      // Create an action with no shortcut/webhook
      actionRepo.create({ name: 'empty-action' });

      const res = await request(app)
        .post('/api/v1/execute')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ action: 'empty-action' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('shortcut or webhook');
    });

    it('schedules delayed execution', async () => {
      const app = createTestApp();
      const apiKey = createTestApiKey();

      actionRepo.create({ name: 'delayed-action', shortcutName: 'My Shortcut' });

      const res = await request(app)
        .post('/api/v1/execute')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ action: 'delayed-action', delay: 60 });

      expect(res.status).toBe(202);
      expect(res.body.status).toBe('scheduled');
      expect(res.body.id).toBeDefined();
      expect(res.body.executeAt).toBeDefined();
    });

    it('validates timeout bounds', async () => {
      const app = createTestApp();
      const apiKey = createTestApiKey();

      const res = await request(app)
        .post('/api/v1/execute')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ shortcut: 'test', timeout: 999 });

      expect(res.status).toBe(400);
    });

    it('requires authentication', async () => {
      const app = createTestApp();

      const res = await request(app)
        .post('/api/v1/execute')
        .send({ shortcut: 'test' });

      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/v1/execute/:id', () => {
    it('cancels a scheduled task', async () => {
      const app = createTestApp();
      const apiKey = createTestApiKey();

      const task = scheduledTaskRepo.create({
        type: 'action',
        referenceId: 'test-ref',
        executeAt: '2099-01-01T00:00:00Z',
      });

      const res = await request(app)
        .delete(`/api/v1/execute/${task.id}`)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('cancelled');

      // Verify it was cancelled
      const updated = scheduledTaskRepo.findById(task.id);
      expect(updated!.status).toBe('cancelled');
    });

    it('returns 404 for non-existent or already executed task', async () => {
      const app = createTestApp();
      const apiKey = createTestApiKey();

      const res = await request(app)
        .delete('/api/v1/execute/fake-id')
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(404);
    });
  });
});
