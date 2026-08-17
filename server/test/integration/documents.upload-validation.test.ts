import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { prisma } from '../../src/lib/prisma.js';
import { app, resetDb, grantActiveSubscription } from '../helpers.js';
import { hashPassword } from '../../src/lib/password.js';

// Spec section 23: "protection contre les uploads malveillants, validation
// des fichiers" — the upload route must not just trust the client's
// declared Content-Type.
describe('upload content-type validation (magic-byte sniffing)', () => {
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
    return agent;
  }

  it('rejects a file whose actual content does not match its claimed Content-Type', async () => {
    const agent = await signedInAgent('spoof@example.com');
    // An HTML/script payload dressed up as a PDF — no %PDF magic bytes.
    const res = await agent
      .post('/api/documents')
      .attach('file', Buffer.from('<script>alert(1)</script>'), { filename: 'invoice.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('validation');

    const documents = await prisma.document.findMany({ where: {} });
    expect(documents).toHaveLength(0); // never persisted
  });

  it('accepts a file whose content genuinely matches its claimed Content-Type', async () => {
    const agent = await signedInAgent('genuine@example.com');
    const minimalPdf = Buffer.from('%PDF-1.4\n%\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF');
    const res = await agent.post('/api/documents').attach('file', minimalPdf, { filename: 'invoice.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(201);
  });
});
