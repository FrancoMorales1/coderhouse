import { pino, type Logger } from 'pino';

import { env, isProduction } from './env.js';

export const logger: Logger = pino({
  level: env.LOG_LEVEL,
  // En producción se loguea JSON crudo; en local, pino-pretty.
  ...(isProduction
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss' },
        },
      }),
  redact: {
    paths: [
      'GEMINI_API_KEY',
      'DATABASE_URL',
      '*.apiKey',
      '*.password',
      'req.headers.authorization',
    ],
    censor: '[oculto]',
  },
});

/** Logger hijo etiquetado por submódulo: `logger.child({ mod: 'whatsapp' })`. */
export function createLogger(mod: string): Logger {
  return logger.child({ mod });
}

export type { Logger };
