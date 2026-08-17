import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { prisma } from '../../src/lib/prisma.js';
import { app, resetDb, createUser, grantActiveSubscription } from '../helpers.js';
import { hashPassword } from '../../src/lib/password.js';

// Spec section 24/26: "Un utilisateur A ne doit JAMAIS pouvoir accéder au
// document de l'utilisateur B." — this is the explicit test the brief asks
// for (section 24: "Tester explicitement ce scénario.").
describe('document isolation between users (IDOR)', () => {
  beforeEach(resetDb);
  afterAll(async () => prisma.$disconnect());

  async function signedInAgent(email: string) {
    const agent = request.agent(app);
    const passwordHash = await hashPassword('correct-horse-battery');
    const user = await prisma.user.create({
      data: { firstName: 'U', countryCode: 'FR', email, passwordHash, profile: { create: {} }, preferences: { create: {} } },
    });
    await grantActiveSubscription(user.id, 'STANDARD');
    await agent.post('/api/auth/login').send({ emailOrPhone: email, password: 'correct-horse-battery' });
    return { agent, user };
  }

  it("user B cannot fetch user A's document by ID (404, not the document)", async () => {
    const a = await signedInAgent('a@example.com');
    const b = await signedInAgent('b@example.com');

    const upload = await a.agent
      .post('/api/documents')
      .attach('file', Buffer.from('Facture EDF 87,42 euros a payer avant le 28 aout 2026'), { filename: 'facture.txt', contentType: 'text/plain' });
    expect(upload.status).toBe(201);
    const documentId = upload.body.document.id;

    const asOwner = await a.agent.get(`/api/documents/${documentId}`);
    expect(asOwner.status).toBe(200);

    const asOther = await b.agent.get(`/api/documents/${documentId}`);
    expect(asOther.status).toBe(404);

    const listAsOther = await b.agent.get('/api/documents');
    expect(listAsOther.body.documents).toEqual([]);
  });

  it("user B cannot obtain or use a file-url for user A's document", async () => {
    const a = await signedInAgent('a2@example.com');
    const b = await signedInAgent('b2@example.com');

    const upload = await a.agent
      .post('/api/documents')
      .attach('file', Buffer.from('hello'), { filename: 'note.txt', contentType: 'text/plain' });
    const documentId = upload.body.document.id;

    const urlAsOther = await b.agent.get(`/api/documents/${documentId}/file-url`);
    expect(urlAsOther.status).toBe(404);

    // Even a validly-signed token for A's document, replayed under B's
    // session, must be rejected — the token's embedded userId has to match
    // the live session, not just be well-formed.
    const urlAsOwner = await a.agent.get(`/api/documents/${documentId}/file-url`);
    const token = new URL(urlAsOwner.body.url, 'http://x').searchParams.get('token');
    const replay = await b.agent.get(`/api/documents/${documentId}/file?token=${token}`);
    expect(replay.status).toBe(400);
  });

  it("user B cannot delete user A's document", async () => {
    const a = await signedInAgent('a3@example.com');
    const b = await signedInAgent('b3@example.com');
    const upload = await a.agent.post('/api/documents').attach('file', Buffer.from('x'), { filename: 'x.txt', contentType: 'text/plain' });
    const documentId = upload.body.document.id;

    const del = await b.agent.delete(`/api/documents/${documentId}`);
    expect(del.status).toBe(404);

    const stillThere = await a.agent.get(`/api/documents/${documentId}`);
    expect(stillThere.status).toBe(200);
  });
});
