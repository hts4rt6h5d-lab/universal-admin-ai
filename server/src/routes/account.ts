import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../lib/validate.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { Errors } from '../lib/errors.js';
import { hashPassword, isPasswordStrongEnough, verifyPassword } from '../lib/password.js';
import { revokeAllUserSessions, clearSessionCookie } from '../lib/session.js';
import { writeAuditLog } from '../lib/audit.js';

export const accountRouter = Router();
accountRouter.use(requireAuth);

accountRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.user!.id },
      include: { profile: true, preferences: true },
    });
    res.json({
      account: {
        firstName: user.firstName,
        email: user.email,
        phone: user.phone,
        countryCode: user.countryCode,
        locale: user.locale,
        timezone: user.profile?.timezone,
        currency: user.profile?.currency,
        preferences: user.preferences,
      },
    });
  })
);

const updateAccountSchema = z.object({
  firstName: z.string().trim().min(1).max(80).optional(),
  countryCode: z.string().trim().length(2).toUpperCase().optional(),
  locale: z.string().trim().min(2).max(10).optional(),
  timezone: z.string().trim().min(1).max(60).optional(),
  currency: z.string().trim().length(3).toUpperCase().optional(),
});

accountRouter.patch(
  '/',
  validateBody(updateAccountSchema),
  asyncHandler(async (req, res) => {
    const { firstName, countryCode, locale, timezone, currency } = req.body as z.infer<typeof updateAccountSchema>;
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { firstName, countryCode, locale },
    });
    if (timezone || currency) {
      await prisma.profile.update({ where: { userId: req.user!.id }, data: { timezone, currency } });
    }
    await writeAuditLog({ userId: req.user!.id, action: 'account.update', ipAddress: req.ip });
    res.status(204).end();
  })
);

const updatePreferencesSchema = z.object({
  aiExplanationLevel: z.enum(['simple', 'standard', 'expert']).optional(),
  aiTone: z.string().trim().min(1).max(40).optional(),
  notifyEmail: z.boolean().optional(),
  notifyPush: z.boolean().optional(),
  remindersEnabled: z.boolean().optional(),
});

accountRouter.patch(
  '/preferences',
  validateBody(updatePreferencesSchema),
  asyncHandler(async (req, res) => {
    const prefs = await prisma.userPreference.update({
      where: { userId: req.user!.id },
      data: req.body as z.infer<typeof updatePreferencesSchema>,
    });
    res.json({ preferences: prefs });
  })
);

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(10).max(200),
});

accountRouter.post(
  '/change-password',
  validateBody(changePasswordSchema),
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body as z.infer<typeof changePasswordSchema>;
    if (!isPasswordStrongEnough(newPassword)) throw Errors.validation('Le nouveau mot de passe doit contenir au moins 10 caractères.');

    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
    const valid = await verifyPassword(user.passwordHash, currentPassword);
    if (!valid) throw Errors.validation('Mot de passe actuel incorrect.');

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    await revokeAllUserSessions(user.id);
    await writeAuditLog({ userId: user.id, action: 'account.password_changed', ipAddress: req.ip });

    clearSessionCookie(res);
    res.status(204).end();
  })
);

// Spec section 27/29: the user must be able to download the data held
// about them. This exports the rows this user owns directly — it does
// not include the raw bytes of uploaded documents (those are available
// individually via GET /api/documents/:id/file-url) to keep the export
// itself small and fast.
accountRouter.get(
  '/export',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const [user, profile, preferences, documents, tasks, deadlines, subscriptions, payments, conversations] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { id: true, firstName: true, email: true, phone: true, countryCode: true, locale: true, createdAt: true } }),
      prisma.profile.findUnique({ where: { userId } }),
      prisma.userPreference.findUnique({ where: { userId } }),
      prisma.document.findMany({ where: { userId, deletedAt: null }, include: { analysis: true } }),
      prisma.task.findMany({ where: { userId } }),
      prisma.deadline.findMany({ where: { userId } }),
      prisma.subscription.findMany({ where: { userId } }),
      prisma.payment.findMany({ where: { userId } }),
      prisma.conversation.findMany({ where: { userId }, include: { messages: true } }),
    ]);

    await writeAuditLog({ userId, action: 'account.data_exported', ipAddress: req.ip });

    res.setHeader('Content-Disposition', 'attachment; filename="universal-admin-ai-export.json"');
    res.json({ exportedAt: new Date().toISOString(), user, profile, preferences, documents, tasks, deadlines, subscriptions, payments, conversations });
  })
);

const deleteAccountSchema = z.object({
  password: z.string().min(1),
  confirm: z.literal('SUPPRIMER'),
});

accountRouter.delete(
  '/',
  validateBody(deleteAccountSchema),
  asyncHandler(async (req, res) => {
    const { password } = req.body as z.infer<typeof deleteAccountSchema>;
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
    const valid = await verifyPassword(user.passwordHash, password);
    if (!valid) throw Errors.validation('Mot de passe incorrect.');

    // Soft delete: keeps referential integrity for financial/audit records
    // (payments, audit_logs) while fully cutting the account's access.
    // A real deployment also needs a scheduled job to hard-delete storage
    // objects and PII after the legal retention window — not implemented
    // here, flagged in server/README.md.
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { deletedAt: new Date(), email: null, phone: null },
      }),
      prisma.session.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
    await writeAuditLog({ userId: user.id, action: 'account.deleted', ipAddress: req.ip });

    clearSessionCookie(res);
    res.status(204).end();
  })
);
