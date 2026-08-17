import pino from 'pino';

// Spec section 30: never log passwords, tokens, API keys, or unnecessary
// personal data. `redact` strips these paths even if a caller accidentally
// logs an object that contains them.
export const logger = pino({
  level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
  redact: {
    paths: [
      'password',
      'passwordHash',
      'token',
      'req.headers.cookie',
      'req.headers.authorization',
      '*.password',
      '*.passwordHash',
      '*.token',
      '*.mfaSecret',
    ],
    censor: '[redacted]',
  },
});
