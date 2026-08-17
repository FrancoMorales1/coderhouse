/** Error base del dominio: todo lo que tiramos a propósito hereda de acá. */
export class AppError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(message: string, options: { code: string; retryable?: boolean; cause?: unknown }) {
    super(message, { cause: options.cause });
    this.name = new.target.name;
    this.code = options.code;
    this.retryable = options.retryable ?? false;
  }
}

export class ConfigError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, { code: 'CONFIG', cause });
  }
}

export class ScrapperError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, { code: 'SCRAPPER', retryable: true, cause });
  }
}

export class AiError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, { code: 'AI', retryable: true, cause });
  }
}

export class WhatsappError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, { code: 'WHATSAPP', retryable: true, cause });
  }
}

export function isRetryable(error: unknown): boolean {
  return error instanceof AppError && error.retryable;
}
