import { buildApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';

const app = buildApp();
app.listen(env.PORT, () => {
  logger.info(`Universal Admin AI API listening on :${env.PORT} (${env.NODE_ENV})`);
});
