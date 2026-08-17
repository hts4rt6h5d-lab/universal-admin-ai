import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { prisma } from '../../src/lib/prisma.js';
import { app, resetDb } from '../helpers.js';

describe('auth', () => {
  beforeEach(resetDb);
  afterAll(async () => prisma.$disconnect());

  it('signup creates an account, sets a session cookie, and never returns the password hash', async () => {
    const res = await request(app).post('/api/auth/signup').send({
      firstName: 'Camille',
      countryCode: 'FR',
      email: 'camille@example.com',
      password: 'correct-horse-battery',
    });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('camille@example.com');
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.headers['set-cookie']?.[0]).toMatch(/uaa_session=.*HttpOnly/);

    const stored = await prisma.user.findUniqueOrThrow({ where: { email: 'camille@example.com' } });
    expect(stored.passwordHash).not.toBe('correct-horse-battery');
    expect(stored.passwordHash).toMatch(/^\$argon2id\$/);
  });

  it('rejects a second signup with the same email', async () => {
    await request(app).post('/api/auth/signup').send({ firstName: 'A', countryCode: 'FR', email: 'dup@example.com', password: 'correct-horse-battery' });
    const res = await request(app).post('/api/auth/signup').send({ firstName: 'B', countryCode: 'FR', email: 'dup@example.com', password: 'correct-horse-battery' });
    expect(res.status).toBe(409);
  });

  it('logs in with correct credentials and rejects wrong ones with a generic message', async () => {
    await request(app).post('/api/auth/signup').send({ firstName: 'Camille', countryCode: 'FR', email: 'login@example.com', password: 'correct-horse-battery' });

    const good = await request(app).post('/api/auth/login').send({ emailOrPhone: 'login@example.com', password: 'correct-horse-battery' });
    expect(good.status).toBe(200);

    const bad = await request(app).post('/api/auth/login').send({ emailOrPhone: 'login@example.com', password: 'wrong-password' });
    expect(bad.status).toBe(400);
    expect(bad.body.error.message).toBe('Identifiants invalides.');

    const noSuchUser = await request(app).post('/api/auth/login').send({ emailOrPhone: 'nobody@example.com', password: 'whatever12345' });
    expect(noSuchUser.status).toBe(400);
    expect(noSuchUser.body.error.message).toBe(bad.body.error.message); // same message either way — no user enumeration
  });

  it('/me requires a valid session', async () => {
    const anon = await request(app).get('/api/auth/me');
    expect(anon.status).toBe(401);

    const agent = request.agent(app);
    await agent.post('/api/auth/signup').send({ firstName: 'Camille', countryCode: 'FR', email: 'me@example.com', password: 'correct-horse-battery' });
    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe('me@example.com');
    expect(me.body.plan).toBeNull(); // no subscription yet
  });

  it('logout revokes the session so the cookie can no longer be used', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/signup').send({ firstName: 'Camille', countryCode: 'FR', email: 'logout@example.com', password: 'correct-horse-battery' });
    await agent.post('/api/auth/logout').expect(204);
    const res = await agent.get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
