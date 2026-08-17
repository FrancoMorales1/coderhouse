import { describe, expect, it } from 'vitest';

import { diaSemanaDe, fechaEnZona, nombreDiaSemana, proximasFechas, sumarDias } from './fechas.js';

describe('fechaEnZona', () => {
  it('usa la fecha argentina, no la del server en UTC', () => {
    // 2026-08-18T02:00Z todavía es 17 de agosto en Mar del Plata (UTC-3).
    expect(fechaEnZona(new Date('2026-08-18T02:00:00Z'))).toBe('2026-08-17');
    expect(fechaEnZona(new Date('2026-08-18T12:00:00Z'))).toBe('2026-08-18');
  });
});

describe('sumarDias', () => {
  it('cruza fin de mes', () => {
    expect(sumarDias('2026-08-31', 1)).toBe('2026-09-01');
  });

  it('cruza fin de año y años bisiestos', () => {
    expect(sumarDias('2026-12-31', 1)).toBe('2027-01-01');
    expect(sumarDias('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('acepta días negativos', () => {
    expect(sumarDias('2026-08-01', -1)).toBe('2026-07-31');
  });
});

describe('proximasFechas', () => {
  it('incluye el día de hoy y devuelve la cantidad pedida', () => {
    expect(proximasFechas('2026-08-17', 7)).toEqual([
      '2026-08-17',
      '2026-08-18',
      '2026-08-19',
      '2026-08-20',
      '2026-08-21',
      '2026-08-22',
      '2026-08-23',
    ]);
  });

  it('devuelve vacío si no se piden días', () => {
    expect(proximasFechas('2026-08-17', 0)).toEqual([]);
  });
});

describe('diaSemanaDe', () => {
  it('ubica bien el día de la semana', () => {
    expect(diaSemanaDe('2026-08-17')).toBe(1); // lunes
    expect(diaSemanaDe('2026-08-18')).toBe(2); // martes
    expect(diaSemanaDe('2026-08-23')).toBe(0); // domingo
  });

  it('lo nombra en español', () => {
    expect(nombreDiaSemana(diaSemanaDe('2026-08-18'))).toBe('martes');
    expect(nombreDiaSemana(diaSemanaDe('2026-08-19'))).toBe('miércoles');
  });
});
