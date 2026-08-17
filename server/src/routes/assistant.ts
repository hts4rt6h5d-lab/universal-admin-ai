import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { requireFeature } from '../middleware/entitlements.js';
import { FEATURES } from '../services/entitlements.js';
import { validateBody } from '../lib/validate.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { Errors } from '../lib/errors.js';
import { getAIProvider } from '../services/ai/index.js';

export const assistantRouter = Router();
// Spec section 8: Standard has no chatbot at all ("PAS DE CHATBOT IA
// AVANCÉ") — the conversational assistant is Premium-only.
assistantRouter.use(requireAuth, requireFeature(FEATURES.chatbotAdvanced));

assistantRouter.get(
  '/conversations',
  asyncHandler(async (req, res) => {
    const conversations = await prisma.conversation.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ conversations });
  })
);

assistantRouter.get(
  '/conversations/:id/messages',
  asyncHandler(async (req, res) => {
    const conversation = await prisma.conversation.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!conversation) throw Errors.notFound('Conversation');
    const messages = await prisma.message.findMany({ where: { conversationId: conversation.id }, orderBy: { createdAt: 'asc' } });
    res.json({ messages });
  })
);

const askSchema = z.object({
  question: z.string().trim().min(1).max(2000),
  conversationId: z.string().uuid().optional(),
  documentId: z.string().uuid().optional(),
});

assistantRouter.post(
  '/ask',
  validateBody(askSchema),
  asyncHandler(async (req, res) => {
    const { question, conversationId, documentId } = req.body as z.infer<typeof askSchema>;

    let contextText = '';
    let documentLabel = 'vos documents';
    if (documentId) {
      // Ownership check — the chatbot may only see documents the caller
      // actually owns (spec section 27: no unrestricted access to all of
      // the user's data, and definitely not to another user's data).
      const document = await prisma.document.findFirst({
        where: { id: documentId, userId: req.user!.id, deletedAt: null },
        include: { pages: { orderBy: { pageNumber: 'asc' } } },
      });
      if (!document) throw Errors.notFound('Document');
      contextText = document.pages.map((p) => p.extractedText ?? '').join('\n\n');
      documentLabel = document.originalName;
    }

    const conversation = conversationId
      ? await prisma.conversation.findFirst({ where: { id: conversationId, userId: req.user!.id } })
      : await prisma.conversation.create({ data: { userId: req.user!.id, title: question.slice(0, 60) } });
    if (!conversation) throw Errors.notFound('Conversation');

    const ai = getAIProvider();
    const result = await ai.answerQuestion({ question, contextText, documentLabel });

    await prisma.message.createMany({
      data: [
        { conversationId: conversation.id, role: 'user', content: question },
        { conversationId: conversation.id, role: 'ai', content: result.answer, sourcesJson: result.sources as unknown as object },
      ],
    });

    res.json({ conversationId: conversation.id, answer: result.answer, sources: result.sources, confidence: result.confidence, insufficientInformation: result.insufficientInformation });
  })
);
