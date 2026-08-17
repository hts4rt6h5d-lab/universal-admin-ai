import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { requireFeature } from '../middleware/entitlements.js';
import { FEATURES } from '../services/entitlements.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { Errors } from '../lib/errors.js';

export const tasksRouter = Router();
tasksRouter.use(requireAuth, requireFeature(FEATURES.tasks));

tasksRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const tasks = await prisma.task.findMany({
      where: { userId: req.user!.id },
      orderBy: [{ status: 'asc' }, { dueAt: 'asc' }],
    });
    res.json({
      tasks,
      remaining: tasks.filter((t) => t.status === 'OPEN').length,
    });
  })
);

tasksRouter.patch(
  '/:id/toggle',
  asyncHandler(async (req, res) => {
    const task = await prisma.task.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!task) throw Errors.notFound('Tâche');
    const updated = await prisma.task.update({
      where: { id: task.id },
      data: { status: task.status === 'OPEN' ? 'DONE' : 'OPEN' },
    });
    res.json({ task: updated });
  })
);

tasksRouter.get(
  '/deadlines',
  asyncHandler(async (req, res) => {
    const deadlines = await prisma.deadline.findMany({ where: { userId: req.user!.id }, orderBy: { dueAt: 'asc' } });
    res.json({ deadlines });
  })
);
