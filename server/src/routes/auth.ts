import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { hashPassword, isPasswordStrongEnough, verifyPassword } from '../lib/password.js';
import { createSession, setSessionCookie, clearSessionCookie, revokeSession, revokeAllUserSessions } from '../lib/session.js';
import { validateBody } from '../lib/validate.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { authRateLimit } from '../middleware/rateLimit.js';
import { Errors } from '../lib/errors.js';
import { writeAuditLog, writeSecurityEvent } from '../lib/audit.js';
import { getActivePlan } from '../services/entitlements.js';

export const authRouter = Router();

const signupSchema = z
  .object({
    firstName: z.string().trim().min(1).max(80),
    countryCode: z.string().trim().length(2).toUpperCase(),
    email: z.string().trim().toLowerCase().email().optional(),
    phone: z.string().trim().min(6).max(20).optional(),
    password: z.string().min(10).max(200),
    locale: z.string().trim().min(2).max(10).default('fr'),
  })
  .refine((d) => d.email || d.phone, { message: 'Un e-mail ou un numéro de téléphone est requis.' });

function publicUser(user: { id: string; firstName: string; email: string | null; phone: string | null; countryCode: string; locale: string; role: string }) {
  return {
    id: user.id,
    firstName: user.firstName,
    email: user.email,
    phone: user.phone,
    countryCode: user.countryCode,
    locale: user.locale,
    role: user.role,
  };
}

authRouter.post(
  '/signup',
  authRateLimit,
  validateBody(signupSchema),
  asyncHandler(async (req, res) => {
    const { firstName, countryCode, email, phone, password, locale } = req.body as z.infer<typeof signupSchema>;

    if (!isPasswordStrongEnough(password)) {
      throw Errors.validation('Le mot de passe doit contenir au moins 10 caractères.');
    }

    const orConditions: Array<{ email: string } | { phone: string }> = [];
    if (email) orConditions.push({ email });
    if (phone) orConditions.push({ phone });
    const existing = await prisma.user.findFirst({ where: { OR: orConditions } });
    if (existing) throw Errors.conflict('Un compte existe déjà avec ces informations.');

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        firstName,
        countryCode,
        email,
        phone,
        passwordHash,
        locale,
        profile: { create: {} },
        preferences: { create: {} },
      },
    });

    const { token } = await createSession({ userId: user.id, ipAddress: req.ip, userAgent: req.get('user-agent') ?? undefined });
    setSessionCookie(res, token);
    await writeAuditLog({ userId: user.id, action: 'user.signup', ipAddress: req.ip });

    res.status(201).json({ user: publicUser(user) });
  })
);

const loginSchema = z.object({
  emailOrPhone: z.string().trim().min(1),
  password: z.string().min(1),
});

authRouter.post(
  '/login',
  authRateLimit,
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { emailOrPhone, password } = req.body as z.infer<typeof loginSchema>;
    const normalized = emailOrPhone.trim().toLowerCase();

    const user = await prisma.user.findFirst({
      where: { OR: [{ email: normalized }, { phone: emailOrPhone.trim() }], deletedAt: null },
    });

    // Same generic message whether the account doesn't exist or the
    // password is wrong — avoids leaking which accounts exist.
    const genericFailure = () => Errors.validation('Identifiants invalides.');

    if (!user) {
      await writeSecurityEvent({ type: 'login_failed', severity: 'INFO', ipAddress: req.ip, metadata: { reason: 'no_such_account' } });
      throw genericFailure();
    }

    const valid = await verifyPassword(user.passwordHash, password);
    if (!valid) {
      await writeSecurityEvent({ userId: user.id, type: 'login_failed', severity: 'WARNING', ipAddress: req.ip });
      throw genericFailure();
    }

    const { token } = await createSession({ userId: user.id, ipAddress: req.ip, userAgent: req.get('user-agent') ?? undefined });
    setSessionCookie(res, token);
    await writeAuditLog({ userId: user.id, action: 'user.login', ipAddress: req.ip });

    res.json({ user: publicUser(user) });
  })
);

authRouter.post(
  '/logout',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.sessionId) await revokeSession(req.sessionId);
    clearSessionCookie(res);
    res.status(204).end();
  })
);

authRouter.post(
  '/logout-all',
  requireAuth,
  asyncHandler(async (req, res) => {
    await revokeAllUserSessions(req.user!.id);
    clearSessionCookie(res);
    await writeAuditLog({ userId: req.user!.id, action: 'user.logout_all_devices', ipAddress: req.ip });
    res.status(204).end();
  })
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
    const plan = await getActivePlan(user.id);
    res.json({ user: publicUser(user), plan });
  })
);

authRouter.get(
  '/sessions',
  requireAuth,
  asyncHandler(async (req, res) => {
    const sessions = await prisma.session.findMany({
      where: { userId: req.user!.id, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, ipAddress: true, userAgent: true, createdAt: true, expiresAt: true },
    });
    res.json({ sessions: sessions.map((s) => ({ ...s, current: s.id === req.sessionId })) });
  })
);

authRouter.post(
  '/sessions/:id/revoke',
  requireAuth,
  asyncHandler(async (req, res) => {
    const session = await prisma.session.findUnique({ where: { id: req.params.id } });
    if (!session || session.userId !== req.user!.id) throw Errors.notFound('Session');
    await revokeSession(session.id);
    res.status(204).end();
  })
);
