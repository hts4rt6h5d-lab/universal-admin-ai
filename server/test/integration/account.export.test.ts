import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { prisma } from '../../src/lib/prisma.js';
import { app, resetDb } from '../helpers.js';

describe('account data export (spec section 27/29)', () => {
  beforeEach(resetDb);
  afterAll(async () => prisma.$disconnect());

  it('lets a user download their own data, and only their own', async () => {
    const a = request.agent(app);
    await a.post('/api/auth/signup').send({ firstName: 'A', countryCode: 'FR', email: 'export-a@example.com', password: 'correct-horse-battery' });
    const b = request.agent(app);
    await b.post('/api/auth/signup').send({ firstName: 'B', countryCode: 'FR', email: 'export-b@example.com', password: 'correct-horse-battery' });

    const res = await a.get('/api/account/export');
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('export-a@example.com');
    expect(res.body.documents).toEqual([]);
  });

  it('requires authentication', async () => {
    const res = await request(app).get('/api/account/export');
    expect(res.status).toBe(401);
  });
});
