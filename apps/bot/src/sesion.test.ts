import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  carrerasVigentes,
  olvidarCarreras,
  olvidarMaterias,
  olvidarOpcion,
  olvidarPlanes,
  materiasVigentes,
  opcionVigente,
  planesVigentes,
  recordarCarreras,
  recordarMaterias,
  recordarOpcion,
  recordarPlanes,
} from './sesion.js';

describe('sesion', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    olvidarCarreras('chat');
    olvidarMaterias('chat');
    olvidarOpcion('chat');
    olvidarPlanes('chat');
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

  it('recuerda y olvida materias pendientes', () => {
    recordarMaterias('chat', ['álgebra']);
    expect(materiasVigentes('chat')).toEqual(['álgebra']);

    olvidarMaterias('chat');
    expect(materiasVigentes('chat')).toBeNull();
  });

  it('recuerda y olvida carreras pendientes', () => {
    recordarCarreras('chat', ['Computación']);
    expect(carrerasVigentes('chat')).toEqual(['Computación']);

    olvidarCarreras('chat');
    expect(carrerasVigentes('chat')).toBeNull();
  });

  it('recuerda y olvida planes pendientes', () => {
    recordarPlanes('chat', ['Computación (Plan 2024)']);
    expect(planesVigentes('chat')).toEqual(['Computación (Plan 2024)']);

    olvidarPlanes('chat');
    expect(planesVigentes('chat')).toBeNull();
  });

  it('expira materias, carreras y planes pendientes', () => {
    recordarMaterias('chat', ['álgebra']);
    recordarCarreras('chat', ['Computación']);
    recordarPlanes('chat', ['Computación (Plan 2024)']);
    vi.advanceTimersByTime(16 * 60 * 1000);

    expect(materiasVigentes('chat')).toBeNull();
    expect(carrerasVigentes('chat')).toBeNull();
    expect(planesVigentes('chat')).toBeNull();
  });
});
