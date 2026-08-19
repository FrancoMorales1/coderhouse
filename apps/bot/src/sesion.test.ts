import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { olvidarOpcion, opcionVigente, recordarOpcion } from './sesion.js';

describe('sesion', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    olvidarOpcion('chat');
  });

  it('recuerda el último tema elegido', () => {
    recordarOpcion('chat', 3);
    expect(opcionVigente('chat')).toBe(3);
  });

  it('no sabe nada de un chat que no eligió nada', () => {
    expect(opcionVigente('otro')).toBeNull();
  });

  it('olvida el tema después de la ventana de vigencia', () => {
    recordarOpcion('chat', 1);
    vi.advanceTimersByTime(16 * 60 * 1000);

    expect(opcionVigente('chat')).toBeNull();
  });

  it('olvidarOpcion corta la conversación en curso', () => {
    recordarOpcion('chat', 2);
    olvidarOpcion('chat');

    expect(opcionVigente('chat')).toBeNull();
  });
});
