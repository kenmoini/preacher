import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/test-app';
import { APP_NAME, APP_VERSION } from '../../shared/constants';

describe('GET /api/v1/health', () => {
  it('returns server health info', async () => {
    const app = createTestApp();
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body.name).toBe(APP_NAME);
    expect(res.body.version).toBe(APP_VERSION);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.uptime).toBe('number');
  });

  it('does not require authentication', async () => {
    const app = createTestApp();
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
  });
});
