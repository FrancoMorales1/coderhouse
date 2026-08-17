import { describe, expect, it } from 'vitest';

import { construirPrompt, extraerFuentes } from './prompt.js';

import type { ConsultaIA } from './types.js';

const consultaBase: ConsultaIA = {
  mensaje: '¿Cuándo son las inscripciones a cursadas?',
  historial: [],
  documentos: [],
};

describe('construirPrompt', () => {
  it('incluye la consulta del usuario', () => {
    const prompt = construirPrompt(consultaBase);

    expect(prompt).toContain('¿Cuándo son las inscripciones a cursadas?');
  });

  it('avisa al modelo cuando no hay horarios cargados', () => {
    const prompt = construirPrompt(consultaBase);

    expect(prompt).toContain('No hay horarios cargados');
  });

  it('numera los documentos y expone su fuente', () => {
    const prompt = construirPrompt({
      ...consultaBase,
      documentos: [
        { titulo: 'Calendario 2026', url: 'https://fi.mdp.edu.ar/calendario', contenido: 'Marzo' },
        { titulo: 'Trámites', url: 'https://fi.mdp.edu.ar/tramites', contenido: 'Alumnos' },
      ],
    });

    expect(prompt).toContain('[1] Calendario 2026');
    expect(prompt).toContain('Fuente: https://fi.mdp.edu.ar/calendario');
    expect(prompt).toContain('[2] Trámites');
  });

  it('trunca documentos largos para no reventar la ventana de contexto', () => {
    const prompt = construirPrompt({
      ...consultaBase,
      documentos: [
        { titulo: 'Plan', url: 'https://fi.mdp.edu.ar/plan', contenido: 'x'.repeat(9000) },
      ],
    });

    expect(prompt).not.toContain('x'.repeat(4001));
    expect(prompt).toContain('x'.repeat(4000));
  });

  it('etiqueta cada turno del historial', () => {
    const prompt = construirPrompt({
      ...consultaBase,
      historial: [
        { rol: 'usuario', contenido: 'Hola' },
        { rol: 'asistente', contenido: '¡Hola! ¿En qué te ayudo?' },
      ],
    });

    expect(prompt).toContain('Usuario: Hola');
    expect(prompt).toContain('Asistente: ¡Hola! ¿En qué te ayudo?');
  });
});

describe('extraerFuentes', () => {
  it('deduplica las URLs', () => {
    const fuentes = extraerFuentes([
      { titulo: 'a', url: 'https://fi.mdp.edu.ar/x', contenido: '' },
      { titulo: 'b', url: 'https://fi.mdp.edu.ar/x', contenido: '' },
      { titulo: 'c', url: 'https://fi.mdp.edu.ar/y', contenido: '' },
    ]);

    expect(fuentes).toEqual(['https://fi.mdp.edu.ar/x', 'https://fi.mdp.edu.ar/y']);
  });
});
