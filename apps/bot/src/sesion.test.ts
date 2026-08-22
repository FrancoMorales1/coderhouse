import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  carrerasVigentes,
  olvidarCarreras,
  olvidarMaterias,
  olvidarOpcion,
  olvidarPlanActivo,
  olvidarPlanes,
  materiasVigentes,
  opcionVigente,
  planActivoVigente,
  planesVigentes,
  recordarCarreras,
  recordarMaterias,
  recordarOpcion,
  recordarPlanActivo,
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
    olvidarPlanActivo('chat');
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

  it('recuerda y olvida el plan activo', () => {
    recordarPlanActivo('chat', 'Ingeniería en Informática (Plan 2024)');
    expect(planActivoVigente('chat')).toBe('Ingeniería en Informática (Plan 2024)');

    olvidarPlanActivo('chat');
    expect(planActivoVigente('chat')).toBeNull();
  });

  it('no sabe nada del plan activo de un chat que no eligió ninguno', () => {
    expect(planActivoVigente('otro')).toBeNull();
  });

  it('aísla el plan activo entre chats distintos', () => {
    recordarPlanActivo('chat', 'Ingeniería Química (Plan 2003)');
    recordarPlanActivo('otro-chat', 'Ingeniería Mecánica (Plan 2024)');

    expect(planActivoVigente('chat')).toBe('Ingeniería Química (Plan 2003)');
    expect(planActivoVigente('otro-chat')).toBe('Ingeniería Mecánica (Plan 2024)');

    olvidarPlanActivo('otro-chat');
  });

  it('olvida el plan activo después de la ventana de vigencia', () => {
    recordarPlanActivo('chat', 'Ingeniería Eléctrica (Plan 2024)');
    vi.advanceTimersByTime(16 * 60 * 1000);

    expect(planActivoVigente('chat')).toBeNull();
  });
});
