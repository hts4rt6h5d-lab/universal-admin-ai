import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { Errors } from '../lib/errors.js';

export const countriesRouter = Router();

// Public — needed on the signup screen before the user has an account.
countriesRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const countries = await prisma.countryProfile.findMany({ orderBy: { name: 'asc' } });
    res.json({ countries });
  })
);

countriesRouter.get(
  '/:code',
  asyncHandler(async (req, res) => {
    const country = await prisma.countryProfile.findUnique({ where: { code: req.params.code.toUpperCase() } });
    if (!country) throw Errors.notFound('Pays');
    res.json({ country });
  })
);
