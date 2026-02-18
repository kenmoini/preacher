import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createTestApp, createTestApiKey } from '../helpers/test-app';

describe('Actions API', () => {
  describe('POST /api/v1/actions', () => {
    it('creates a server action', async () => {
      const app = createTestApp();
      const apiKey = createTestApiKey();

      const res = await request(app)
        .post('/api/v1/actions')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ name: 'run-backup', shortcutName: 'Backup Script', timeoutSeconds: 60 });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('run-backup');
    });

    it('rejects duplicate names', async () => {
      const app = createTestApp();
      const apiKey = createTestApiKey();

      await request(app)
        .post('/api/v1/actions')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ name: 'dupe-action' });

      const res = await request(app)
        .post('/api/v1/actions')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ name: 'dupe-action' });

      expect(res.status).toBe(409);
    });

    it('validates timeout bounds', async () => {
      const app = createTestApp();
      const apiKey = createTestApiKey();

      const res = await request(app)
        .post('/api/v1/actions')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ name: 'bad-timeout', timeoutSeconds: 999 });

      expect(res.status).toBe(400);
    });

    it('validates webhook URL format', async () => {
      const app = createTestApp();
      const apiKey = createTestApiKey();

      const res = await request(app)
        .post('/api/v1/actions')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ name: 'bad-webhook', webhookUrl: 'not-a-url' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/actions', () => {
    it('lists all actions', async () => {
      const app = createTestApp();
      const apiKey = createTestApiKey();

      await request(app)
        .post('/api/v1/actions')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ name: 'act-1' });

      await request(app)
        .post('/api/v1/actions')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ name: 'act-2' });

      const res = await request(app)
        .get('/api/v1/actions')
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0]).toHaveProperty('name');
      expect(res.body[0]).toHaveProperty('shortcutName');
      expect(res.body[0]).toHaveProperty('timeoutSeconds');
    });
  });

  describe('PUT /api/v1/actions/:id', () => {
    it('updates an action', async () => {
      const app = createTestApp();
      const apiKey = createTestApiKey();

      const { body: created } = await request(app)
        .post('/api/v1/actions')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ name: 'to-update' });

      const res = await request(app)
        .put(`/api/v1/actions/${created.id}`)
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ name: 'updated-name', timeoutSeconds: 120 });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('updated-name');
    });

    it('returns 404 for non-existent action', async () => {
      const app = createTestApp();
      const apiKey = createTestApiKey();

      const res = await request(app)
        .put('/api/v1/actions/fake-id')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ name: 'x' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/actions/:id', () => {
    it('deletes an action', async () => {
      const app = createTestApp();
      const apiKey = createTestApiKey();

      const { body: created } = await request(app)
        .post('/api/v1/actions')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ name: 'to-delete' });

      const res = await request(app)
        .delete(`/api/v1/actions/${created.id}`)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(204);
    });

    it('returns 404 for non-existent action', async () => {
      const app = createTestApp();
      const apiKey = createTestApiKey();

      const res = await request(app)
        .delete('/api/v1/actions/fake')
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(404);
    });
  });
});
