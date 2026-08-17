import { describe, expect, it } from 'vitest';

import { AiError, AppError, ConfigError, isRetryable } from './errors.js';

describe('errores del dominio', () => {
  it('expone el code y conserva el name de la subclase', () => {
    const error = new ConfigError('falta DATABASE_URL');

    expect(error).toBeInstanceOf(AppError);
    expect(error.name).toBe('ConfigError');
    expect(error.code).toBe('CONFIG');
  });

  it('marca como reintentables solo los errores de servicios externos', () => {
    expect(isRetryable(new AiError('timeout de Gemini'))).toBe(true);
    expect(isRetryable(new ConfigError('falta la API key'))).toBe(false);
    expect(isRetryable(new Error('cualquier cosa'))).toBe(false);
  });

  it('encadena la causa original', () => {
    const causa = new Error('ECONNRESET');
    const error = new AiError('no se pudo consultar el modelo', causa);

    expect(error.cause).toBe(causa);
  });
});
