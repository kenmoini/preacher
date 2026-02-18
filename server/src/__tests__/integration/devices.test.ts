import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createTestApp, createTestApiKey } from '../helpers/test-app';

describe('Devices API', () => {
  describe('POST /api/v1/devices', () => {
    it('registers a new device', async () => {
      const app = createTestApp();

      const res = await request(app)
        .post('/api/v1/devices')
        .send({ name: 'My iPhone', apnsToken: 'token123', platform: 'ios' });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.registrationToken).toBeDefined();
      expect(res.body.registrationToken).toHaveLength(64);
    });

    it('returns existing device when APNs token already registered', async () => {
      const app = createTestApp();

      const first = await request(app)
        .post('/api/v1/devices')
        .send({ name: 'iPhone', apnsToken: 'sametoken', platform: 'ios' });

      const second = await request(app)
        .post('/api/v1/devices')
        .send({ name: 'iPhone Updated', apnsToken: 'sametoken', platform: 'ios' });

      expect(second.status).toBe(200);
      expect(second.body.id).toBe(first.body.id);
      expect(second.body.registrationToken).toBeDefined();
    });

    it('allows optional auth (no key required)', async () => {
      const app = createTestApp();

      const res = await request(app)
        .post('/api/v1/devices')
        .send({ name: 'Device', apnsToken: 'tok', platform: 'ios' });

      expect(res.status).toBe(201);
    });

    it('rejects invalid body', async () => {
      const app = createTestApp();

      const res = await request(app)
        .post('/api/v1/devices')
        .send({ name: '' }); // missing apnsToken, empty name

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/devices', () => {
    it('requires authentication', async () => {
      const app = createTestApp();

      const res = await request(app).get('/api/v1/devices');
      expect(res.status).toBe(401);
    });

    it('lists all devices', async () => {
      const app = createTestApp();
      const apiKey = createTestApiKey();

      // Register two devices
      await request(app).post('/api/v1/devices').send({ name: 'D1', apnsToken: 't1', platform: 'ios' });
      await request(app).post('/api/v1/devices').send({ name: 'D2', apnsToken: 't2', platform: 'ios' });

      const res = await request(app)
        .get('/api/v1/devices')
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0]).toHaveProperty('id');
      expect(res.body[0]).toHaveProperty('name');
      expect(res.body[0]).toHaveProperty('platform');
      expect(res.body[0]).toHaveProperty('isAutomationServer');
    });
  });

  describe('PUT /api/v1/devices/:id', () => {
    it('updates a device', async () => {
      const app = createTestApp();
      const apiKey = createTestApiKey();

      const { body: device } = await request(app)
        .post('/api/v1/devices')
        .send({ name: 'Old Name', apnsToken: 'tok', platform: 'ios' });

      const res = await request(app)
        .put(`/api/v1/devices/${device.id}`)
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ name: 'New Name', isAutomationServer: true });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('New Name');
      expect(res.body.isAutomationServer).toBe(true);
    });

    it('returns 404 for non-existent device', async () => {
      const app = createTestApp();
      const apiKey = createTestApiKey();

      const res = await request(app)
        .put('/api/v1/devices/non-existent-id')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ name: 'X' });

      expect(res.status).toBe(404);
    });

    it('requires authentication', async () => {
      const app = createTestApp();

      const res = await request(app)
        .put('/api/v1/devices/some-id')
        .send({ name: 'X' });

      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/v1/devices/:id', () => {
    it('deletes a device', async () => {
      const app = createTestApp();
      const apiKey = createTestApiKey();

      const { body: device } = await request(app)
        .post('/api/v1/devices')
        .send({ name: 'ToDelete', apnsToken: 'tok', platform: 'ios' });

      const res = await request(app)
        .delete(`/api/v1/devices/${device.id}`)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(204);

      // Verify gone
      const list = await request(app)
        .get('/api/v1/devices')
        .set('Authorization', `Bearer ${apiKey}`);

      expect(list.body).toHaveLength(0);
    });

    it('returns 404 for non-existent device', async () => {
      const app = createTestApp();
      const apiKey = createTestApiKey();

      const res = await request(app)
        .delete('/api/v1/devices/fake')
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(404);
    });
  });
});
