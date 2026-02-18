import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createTestApp, createTestApiKey } from '../helpers/test-app';

describe('Notifications API', () => {
  // --- Notification Definitions (Templates) ---

  describe('POST /api/v1/notifications/definitions', () => {
    it('creates a notification definition', async () => {
      const app = createTestApp();
      const apiKey = createTestApiKey();

      const res = await request(app)
        .post('/api/v1/notifications/definitions')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({
          name: 'welcome',
          title: 'Welcome!',
          text: 'Hello there',
          sound: 'system',
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('welcome');
    });

    it('rejects duplicate names', async () => {
      const app = createTestApp();
      const apiKey = createTestApiKey();

      await request(app)
        .post('/api/v1/notifications/definitions')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ name: 'dupe', title: 'First' });

      const res = await request(app)
        .post('/api/v1/notifications/definitions')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ name: 'dupe', title: 'Second' });

      expect(res.status).toBe(409);
    });

    it('validates sound enum', async () => {
      const app = createTestApp();
      const apiKey = createTestApiKey();

      const res = await request(app)
        .post('/api/v1/notifications/definitions')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ name: 'bad-sound', sound: 'invalid_sound' });

      expect(res.status).toBe(400);
    });

    it('limits actions to 4', async () => {
      const app = createTestApp();
      const apiKey = createTestApiKey();

      const actions = Array(5).fill(null).map((_, i) => ({ name: `Action ${i}` }));

      const res = await request(app)
        .post('/api/v1/notifications/definitions')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ name: 'too-many-actions', actions });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/notifications/definitions', () => {
    it('lists all definitions', async () => {
      const app = createTestApp();
      const apiKey = createTestApiKey();

      await request(app)
        .post('/api/v1/notifications/definitions')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ name: 'def-1', title: 'One' });

      await request(app)
        .post('/api/v1/notifications/definitions')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ name: 'def-2', title: 'Two' });

      const res = await request(app)
        .get('/api/v1/notifications/definitions')
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0]).toHaveProperty('id');
      expect(res.body[0]).toHaveProperty('name');
      expect(res.body[0]).toHaveProperty('actions');
    });
  });

  describe('PUT /api/v1/notifications/definitions/:id', () => {
    it('updates a definition', async () => {
      const app = createTestApp();
      const apiKey = createTestApiKey();

      const { body: created } = await request(app)
        .post('/api/v1/notifications/definitions')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ name: 'to-update', title: 'Old' });

      const res = await request(app)
        .put(`/api/v1/notifications/definitions/${created.id}`)
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ title: 'New Title' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('to-update');
    });

    it('returns 404 for non-existent definition', async () => {
      const app = createTestApp();
      const apiKey = createTestApiKey();

      const res = await request(app)
        .put('/api/v1/notifications/definitions/fake-id')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ title: 'X' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/notifications/definitions/:id', () => {
    it('deletes a definition', async () => {
      const app = createTestApp();
      const apiKey = createTestApiKey();

      const { body: created } = await request(app)
        .post('/api/v1/notifications/definitions')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ name: 'to-delete' });

      const res = await request(app)
        .delete(`/api/v1/notifications/definitions/${created.id}`)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(204);
    });
  });

  // --- Sending Notifications ---

  describe('POST /api/v1/notifications', () => {
    it('sends an ad-hoc notification', async () => {
      const app = createTestApp();
      const apiKey = createTestApiKey();

      const res = await request(app)
        .post('/api/v1/notifications')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ title: 'Test Alert', text: 'Hello world' });

      expect(res.status).toBe(200);
      expect(res.body.id).toBeDefined();
      expect(res.body.status).toBeDefined();
    });

    it('requires at least title or text', async () => {
      const app = createTestApp();
      const apiKey = createTestApiKey();

      const res = await request(app)
        .post('/api/v1/notifications')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ sound: 'system' }); // no title or text

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('title or text');
    });

    it('requires authentication', async () => {
      const app = createTestApp();

      const res = await request(app)
        .post('/api/v1/notifications')
        .send({ title: 'Test' });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/notifications/:name', () => {
    it('sends a notification using a template', async () => {
      const app = createTestApp();
      const apiKey = createTestApiKey();

      // Create definition first
      await request(app)
        .post('/api/v1/notifications/definitions')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ name: 'alert', title: 'Alert Template', text: 'Default text' });

      const res = await request(app)
        .post('/api/v1/notifications/alert')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.id).toBeDefined();
    });

    it('returns 404 for non-existent template', async () => {
      const app = createTestApp();
      const apiKey = createTestApiKey();

      const res = await request(app)
        .post('/api/v1/notifications/nonexistent')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({});

      expect(res.status).toBe(404);
    });
  });

  // --- Notification Log ---

  describe('GET /api/v1/log', () => {
    it('returns paginated notification log', async () => {
      const app = createTestApp();
      const apiKey = createTestApiKey();

      // Send a notification to create log entries
      await request(app)
        .post('/api/v1/notifications')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ title: 'Log Test' });

      const res = await request(app)
        .get('/api/v1/log')
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('entries');
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('limit');
      expect(res.body).toHaveProperty('offset');
      expect(res.body.total).toBeGreaterThanOrEqual(1);
    });

    it('respects limit parameter', async () => {
      const app = createTestApp();
      const apiKey = createTestApiKey();

      // Create several log entries
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/v1/notifications')
          .set('Authorization', `Bearer ${apiKey}`)
          .send({ title: `Notif ${i}` });
      }

      const res = await request(app)
        .get('/api/v1/log?limit=2')
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.body.entries).toHaveLength(2);
      expect(res.body.limit).toBe(2);
    });

    it('caps limit at 200', async () => {
      const app = createTestApp();
      const apiKey = createTestApiKey();

      const res = await request(app)
        .get('/api/v1/log?limit=999')
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.body.limit).toBe(200);
    });
  });
});
