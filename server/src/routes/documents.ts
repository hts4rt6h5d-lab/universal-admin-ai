import { Router } from 'express';
import crypto from 'node:crypto';
import multer from 'multer';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { requireFeature } from '../middleware/entitlements.js';
import { FEATURES } from '../services/entitlements.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { Errors } from '../lib/errors.js';
import { env } from '../config/env.js';
import { storage } from '../services/storage/index.js';
import { extractText } from '../services/extractText.js';
import { getAIProvider } from '../services/ai/index.js';
import { signDocumentToken, verifyDocumentToken } from '../lib/signedUrl.js';
import { writeAuditLog, writeSecurityEvent } from '../lib/audit.js';
import { matchesClaimedType } from '../lib/fileSniff.js';

export const documentsRouter = Router();
// Router-wide gate: no free tier (spec section 7/8) — every document
// route, not just upload, requires an active plan that includes
// document_analysis.
documentsRouter.use(requireAuth, requireFeature(FEATURES.documentAnalysis));

const ALLOWED_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/webp', 'text/plain']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new Error('UNSUPPORTED_FILE_TYPE'));
      return;
    }
    cb(null, true);
  },
});

function priorityForDueDate(dueDate: Date | null): 'URGENT' | 'SOON' | 'PLANNED' {
  if (!dueDate) return 'PLANNED';
  const days = (dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (days <= 7) return 'URGENT';
  if (days <= 30) return 'SOON';
  return 'PLANNED';
}

documentsRouter.post(
  '/',
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) return next(Errors.validation("Ce fichier n'est pas pris en charge ou dépasse la taille maximale autorisée."));
      next();
    });
  },
  asyncHandler(async (req, res) => {
    const file = req.file;
    if (!file) throw Errors.validation('Aucun fichier reçu.');
    if (!matchesClaimedType(file.buffer, file.mimetype)) {
      await writeSecurityEvent({
        userId: req.user!.id,
        type: 'upload_content_type_mismatch',
        severity: 'WARNING',
        metadata: { claimed: file.mimetype, filename: file.originalname },
        ipAddress: req.ip,
      });
      throw Errors.validation("Ce fichier ne correspond pas au type annoncé. Il n'a pas été accepté.");
    }

    const documentId = crypto.randomUUID();
    const storageKey = await storage.save(req.user!.id, documentId, file.buffer);

    const document = await prisma.document.create({
      data: {
        id: documentId,
        userId: req.user!.id,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storageKey,
        status: 'PROCESSING',
      },
    });

    const { text, pages } = await extractText(file.buffer, file.mimetype);
    if (pages.length) {
      await prisma.documentPage.createMany({
        data: pages.map((extractedText, i) => ({ documentId: document.id, pageNumber: i + 1, extractedText })),
      });
    }

    const ai = getAIProvider();
    const [country, language, analysis] = await Promise.all([
      ai.detectCountry(text),
      ai.detectLanguage(text),
      ai.analyzeDocument({ text, filename: file.originalname, mimeType: file.mimetype }),
    ]);

    const dueDate = analysis.dueDate ? new Date(analysis.dueDate) : null;

    await prisma.$transaction([
      prisma.document.update({
        where: { id: document.id },
        data: {
          status: 'ANALYZED',
          category: analysis.documentType,
          detectedCountry: country.value,
          detectedLanguage: language.value,
          detectionConfidence: country.confidence,
        },
      }),
      prisma.documentAnalysis.create({
        data: {
          documentId: document.id,
          documentType: analysis.documentType,
          summary: analysis.summary,
          simpleSummary: analysis.simpleSummary,
          amountCents: analysis.amountCents,
          currency: analysis.currency,
          dueDate,
          actionRequired: analysis.actionRequired,
          confidence: analysis.confidence,
          aiProvider: analysis.provider,
          rawJson: analysis as unknown as object,
        },
      }),
      ...(analysis.sources.length
        ? [
            prisma.documentSource.createMany({
              data: analysis.sources.map((s) => ({ documentId: document.id, label: s.label, kind: s.kind, url: s.url })),
            }),
          ]
        : []),
    ]);

    let createdTask = null;
    if (dueDate) {
      createdTask = await prisma.task.create({
        data: {
          userId: req.user!.id,
          documentId: document.id,
          title: analysis.actionRequired || `Vérifier : ${file.originalname}`,
          priority: priorityForDueDate(dueDate),
          dueAt: dueDate,
          source: analysis.documentType,
        },
      });
      await prisma.deadline.create({
        data: { userId: req.user!.id, documentId: document.id, title: analysis.documentType, dueAt: dueDate },
      });
    }

    await writeAuditLog({ userId: req.user!.id, action: 'document.uploaded', targetType: 'document', targetId: document.id });

    res.status(201).json({
      document: { ...document, status: 'ANALYZED', category: analysis.documentType, detectedCountry: country.value, detectedLanguage: language.value },
      analysis,
      task: createdTask,
    });
  })
);

documentsRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const documents = await prisma.document.findMany({
      where: { userId: req.user!.id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { analysis: true },
    });
    res.json({ documents });
  })
);

async function loadOwnedDocument(userId: string, documentId: string) {
  const document = await prisma.document.findFirst({
    where: { id: documentId, userId, deletedAt: null },
    include: { analysis: true, sources: true },
  });
  // 404, not 403: we don't confirm to a non-owner that the document exists.
  if (!document) throw Errors.notFound('Document');
  return document;
}

documentsRouter.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const document = await loadOwnedDocument(req.user!.id, req.params.id);
    res.json({ document });
  })
);

documentsRouter.get(
  '/:id/file-url',
  requireAuth,
  asyncHandler(async (req, res) => {
    const document = await loadOwnedDocument(req.user!.id, req.params.id);
    const token = signDocumentToken(document.id, req.user!.id, 300);
    res.json({ url: `/api/documents/${document.id}/file?token=${token}`, expiresInSeconds: 300 });
  })
);

documentsRouter.get(
  '/:id/file',
  requireAuth,
  asyncHandler(async (req, res) => {
    const token = req.query.token;
    if (typeof token !== 'string') throw Errors.validation('Lien invalide ou expiré.');
    const payload = verifyDocumentToken(token);
    // Belt-and-suspenders: the signed token AND the live session must both
    // agree this is the owning user, and both must match the document's
    // actual owner in the database.
    if (!payload || payload.documentId !== req.params.id || payload.userId !== req.user!.id) {
      throw Errors.validation('Lien invalide ou expiré.');
    }
    const document = await loadOwnedDocument(req.user!.id, req.params.id);
    const buffer = await storage.read(document.storageKey);
    res.setHeader('Content-Type', document.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(document.originalName)}"`);
    res.send(buffer);
  })
);

documentsRouter.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const document = await loadOwnedDocument(req.user!.id, req.params.id);
    await storage.delete(document.storageKey);
    await prisma.document.update({ where: { id: document.id }, data: { deletedAt: new Date(), storageKey: '' } });
    await writeAuditLog({ userId: req.user!.id, action: 'document.deleted', targetType: 'document', targetId: document.id });
    res.status(204).end();
  })
);
