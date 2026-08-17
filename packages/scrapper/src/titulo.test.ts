import { describe, expect, it } from 'vitest';

import { normalizarMateria, parsearTitulo } from './titulo.js';

describe('parsearTitulo', () => {
  it('separa materia, tipo y comisión cuando vienen pegados', () => {
    expect(parsearTitulo('analisis matematico I(P)A2')).toEqual({
      materia: 'analisis matematico i',
      tipo: 'practica',
      comision: 'A2',
    });
  });

  it('tolera espacios adentro del paréntesis', () => {
    expect(parsearTitulo('analisis matematico III ( T) A2')).toEqual({
      materia: 'analisis matematico iii',
      tipo: 'teoria',
      comision: 'A2',
    });
  });

  it('reconoce el tipo pegado con guión y sin comisión', () => {
    expect(parsearTitulo('informatica basica-T')).toEqual({
      materia: 'informatica basica',
      tipo: 'teoria',
      comision: undefined,
    });
  });

  it('entiende las variantes de teórico-práctica', () => {
    expect(parsearTitulo('seg. hig. y medio ambiente(TP)').tipo).toBe('teorico_practica');
    expect(parsearTitulo('industrias alimentarias (T-P)').tipo).toBe('teorico_practica');
    expect(parsearTitulo('Física A (TP)-TM')).toEqual({
      materia: 'física a',
      tipo: 'teorico_practica',
      comision: 'TM',
    });
  });

  it('no confunde un paréntesis que no es tipo de clase', () => {
    expect(parsearTitulo('base de datos II (OP)')).toEqual({
      materia: 'base de datos ii (op)',
      tipo: 'otro',
      comision: undefined,
    });
  });

  it('deja pasar entero lo que no sigue ningún patrón conocido', () => {
    expect(parsearTitulo('algebra 1A')).toEqual({
      materia: 'algebra 1a',
      tipo: 'otro',
      comision: undefined,
    });
  });

  it('conserva comisiones con formato raro', () => {
    expect(parsearTitulo('lab.de operaciones unitarias(P)com:I').comision).toBe('com:I');
  });

  it('no deja separadores colgando en la materia', () => {
    expect(parsearTitulo('procesam.de met.y sus aleaciones-(TP)').materia).toBe(
      'procesam.de met.y sus aleaciones',
    );
  });
});

describe('normalizarMateria', () => {
  it('baja a minúsculas y colapsa espacios', () => {
    expect(normalizarMateria('  Analisis   Matematico   I ')).toBe('analisis matematico i');
  });

  it('mantiene los acentos, que el full-text en español sabe manejar', () => {
    expect(normalizarMateria('Física C II')).toBe('física c ii');
  });
});
