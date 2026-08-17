import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { requestLogger } from './middleware/requestLogger.js';
import { attachUser } from './middleware/auth.js';
import { apiRateLimit } from './middleware/rateLimit.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { authRouter } from './routes/auth.js';
import { accountRouter } from './routes/account.js';
import { subscriptionsRouter } from './routes/subscriptions.js';
import { stripeWebhookRouter } from './routes/stripeWebhook.js';
import { documentsRouter } from './routes/documents.js';
import { tasksRouter } from './routes/tasks.js';
import { assistantRouter } from './routes/assistant.js';
import { countriesRouter } from './routes/countries.js';

export function buildApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(
    cors({
      origin: env.WEB_ORIGIN,
      credentials: true,
    })
  );
  if (env.NODE_ENV !== 'test') app.use(requestLogger);

  // Stripe webhooks need the raw request body to verify the signature, so
  // this route is mounted before the JSON body parser and parses its own
  // body as a Buffer (see routes/stripeWebhook.ts).
  app.use('/api/stripe/webhook', stripeWebhookRouter);

  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(attachUser);
  app.use('/api', apiRateLimit);

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  app.use('/api/auth', authRouter);
  app.use('/api/account', accountRouter);
  app.use('/api/subscriptions', subscriptionsRouter);
  app.use('/api/documents', documentsRouter);
  app.use('/api/tasks', tasksRouter);
  app.use('/api/assistant', assistantRouter);
  app.use('/api/countries', countriesRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
