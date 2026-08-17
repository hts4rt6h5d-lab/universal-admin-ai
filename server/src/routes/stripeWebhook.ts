import { Router } from 'express';
import express from 'express';
import { verifyWebhookSignature, handleWebhookEvent } from '../services/stripe/index.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { logger } from '../lib/logger.js';

export const stripeWebhookRouter = Router();

// Stripe signs the *raw* request body, so this route must receive a Buffer,
// not JSON-parsed. That's why it's mounted before express.json() in app.ts.
stripeWebhookRouter.post(
  '/',
  express.raw({ type: 'application/json' }),
  asyncHandler(async (req, res) => {
    const signature = req.headers['stripe-signature'];
    if (typeof signature !== 'string') {
      res.status(400).json({ error: { code: 'invalid_signature', message: 'Missing Stripe-Signature header.' } });
      return;
    }

    let event;
    try {
      event = verifyWebhookSignature(req.body as Buffer, signature);
    } catch (err) {
      logger.warn({ err }, 'rejected webhook with invalid signature');
      res.status(400).json({ error: { code: 'invalid_signature', message: 'Signature verification failed.' } });
      return;
    }

    await handleWebhookEvent(event);
    res.json({ received: true });
  })
);
