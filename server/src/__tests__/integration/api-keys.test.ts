import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createTestApp, createTestApiKey } from '../helpers/test-app';

describe('API Keys', () => {
  describe('POST /api/v1/api-keys', () => {
    it('creates a new API key', async () => {
      const app = createTestApp();
      const authKey = createTestApiKey();

      const res = await request(app)
        .post('/api/v1/api-keys')
        .set('Authorization', `Bearer ${authKey}`)
        .send({ name: 'New Key' });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('New Key');
      expect(res.body.key).toMatch(/^pk_/);
      expect(res.body.keyPrefix).toBeDefined();
      expect(res.body.permissions).toEqual(['*']);
    });

    it('supports custom permissions', async () => {
      const app = createTestApp();
      const authKey = createTestApiKey();

      const res = await request(app)
        .post('/api/v1/api-keys')
        .set('Authorization', `Bearer ${authKey}`)
        .send({ name: 'Limited', permissions: ['read'] });

      expect(res.status).toBe(201);
      expect(res.body.permissions).toEqual(['read']);
    });

    it('requires authentication', async () => {
      const app = createTestApp();

      const res = await request(app)
        .post('/api/v1/api-keys')
        .send({ name: 'Test' });

      expect(res.status).toBe(401);
    });

    it('rejects invalid body', async () => {
      const app = createTestApp();
      const authKey = createTestApiKey();

      const res = await request(app)
        .post('/api/v1/api-keys')
        .set('Authorization', `Bearer ${authKey}`)
        .send({ name: '' }); // empty name

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/api-keys', () => {
    it('lists API keys with masked values', async () => {
      const app = createTestApp();
      const authKey = createTestApiKey();

      // Create an extra key
      await request(app)
        .post('/api/v1/api-keys')
        .set('Authorization', `Bearer ${authKey}`)
        .send({ name: 'Extra' });

      const res = await request(app)
        .get('/api/v1/api-keys')
        .set('Authorization', `Bearer ${authKey}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2); // auth key + extra
      // Should NOT expose the raw key
      expect(res.body[0]).not.toHaveProperty('key');
      expect(res.body[0]).toHaveProperty('keyPrefix');
    });
  });

  describe('DELETE /api/v1/api-keys/:id', () => {
    it('deletes an API key', async () => {
      const app = createTestApp();
      const authKey = createTestApiKey();

      // Create a key to delete
      const { body: created } = await request(app)
        .post('/api/v1/api-keys')
        .set('Authorization', `Bearer ${authKey}`)
        .send({ name: 'ToDelete' });

      const res = await request(app)
        .delete(`/api/v1/api-keys/${created.id}`)
        .set('Authorization', `Bearer ${authKey}`);

      expect(res.status).toBe(204);
    });

    it('returns 404 for non-existent key', async () => {
      const app = createTestApp();
      const authKey = createTestApiKey();

      const res = await request(app)
        .delete('/api/v1/api-keys/fake-id')
        .set('Authorization', `Bearer ${authKey}`);

      expect(res.status).toBe(404);
    });
  });

  describe('Authentication flow', () => {
    it('rejects requests with missing Authorization header', async () => {
      const app = createTestApp();
      createTestApiKey(); // ensure at least one key exists

      const res = await request(app).get('/api/v1/devices');
      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Authorization');
    });

    it('rejects requests with invalid Bearer token', async () => {
      const app = createTestApp();

      const res = await request(app)
        .get('/api/v1/devices')
        .set('Authorization', 'Bearer pk_invalidkey');

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Invalid API key');
    });

    it('rejects non-Bearer auth schemes', async () => {
      const app = createTestApp();

      const res = await request(app)
        .get('/api/v1/devices')
        .set('Authorization', 'Basic dXNlcjpwYXNz');

      expect(res.status).toBe(401);
    });
  });
});
