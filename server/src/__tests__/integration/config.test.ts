import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createTestApp, createTestApiKey } from '../helpers/test-app';

describe('Config API', () => {
  describe('GET /api/v1/config/apns', () => {
    it('returns not configured when no APNs config exists', async () => {
      const app = createTestApp();
      const apiKey = createTestApiKey();

      const res = await request(app)
        .get('/api/v1/config/apns')
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(200);
      expect(res.body.configured).toBe(false);
    });

    it('requires authentication', async () => {
      const app = createTestApp();

      const res = await request(app).get('/api/v1/config/apns');
      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/v1/config/apns', () => {
    it('validates keyId length (must be 10)', async () => {
      const app = createTestApp();
      const apiKey = createTestApiKey();

      const res = await request(app)
        .put('/api/v1/config/apns')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({
          keyPath: '/path/to/key.p8',
          keyId: 'SHORT',
          teamId: 'TEAM123456',
          bundleId: 'com.example.app',
        });

      expect(res.status).toBe(400);
    });

    it('validates bundleId format', async () => {
      const app = createTestApp();
      const apiKey = createTestApiKey();

      const res = await request(app)
        .put('/api/v1/config/apns')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({
          keyPath: '/path/to/key.p8',
          keyId: 'KEY1234567',
          teamId: 'TEAM123456',
          bundleId: 'invalid bundle id with spaces',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/config/apns/test', () => {
    it('returns 400 when APNs not configured', async () => {
      const app = createTestApp();
      const apiKey = createTestApiKey();

      const res = await request(app)
        .post('/api/v1/config/apns/test')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ deviceId: 'some-device' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('not configured');
    });

    it('requires deviceId', async () => {
      const app = createTestApp();
      const apiKey = createTestApiKey();

      const res = await request(app)
        .post('/api/v1/config/apns/test')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });
});
