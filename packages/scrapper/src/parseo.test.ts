import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { parsearDia, parsearDiaDetallado, segundosAHora } from './parseo.js';

const aqui = dirname(fileURLToPath(import.meta.url));

/** HTML real de salas.fi.mdp.edu.ar, guardado para poder testear sin red. */
const HTML_REAL = readFileSync(join(aqui, '__fixtures__', 'mrbs-dia-2026-08-18.html'), 'utf8');
const FECHA = '2026-08-18';

describe('segundosAHora', () => {
  it('formatea con dos dígitos', () => {
    expect(segundosAHora(25_200)).toBe('07:00');
    expect(segundosAHora(30_600)).toBe('08:30');
    expect(segundosAHora(79_200)).toBe('22:00');
  });
});

describe('parsearDia sobre el HTML real de la Facultad', () => {
  const clases = parsearDia(HTML_REAL, FECHA);

  it('encuentra clases', () => {
    expect(clases.length).toBeGreaterThan(50);
  });

  it('reconstruye las columnas sin desalinearse', () => {
    const { desalineadas, celdasVerificadas } = parsearDiaDetallado(HTML_REAL, FECHA);

    expect(celdasVerificadas).toBeGreaterThan(500);
    expect(desalineadas).toBe(0);
  });

  it('le pone a cada clase la fecha y el día de la semana pedidos', () => {
    expect(clases.every((c) => c.fecha === FECHA)).toBe(true);
    expect(clases.every((c) => c.diaSemana === 2)).toBe(true); // martes
  });

  it('calcula la duración a partir del rowspan', () => {
    const amI = clases.find((c) => c.entryId === '165742');

    expect(amI).toMatchObject({
      tituloCrudo: 'analisis matematico I(P)A2',
      materia: 'analisis matematico i',
      tipo: 'practica',
      comision: 'A2',
      horaInicio: '08:00',
      horaFin: '10:00', // rowspan=4 x 30 min
    });
  });

  it('asigna un aula real a cada clase', () => {
    expect(clases.every((c) => c.aula.length > 0)).toBe(true);
    expect(new Set(clases.map((c) => c.aula)).size).toBeGreaterThan(5);
  });

  it('no inventa horarios fuera de la grilla', () => {
    for (const clase of clases) {
      expect(clase.horaInicio >= '07:00').toBe(true);
      expect(clase.horaFin <= '22:30').toBe(true);
      expect(clase.horaFin > clase.horaInicio).toBe(true);
    }
  });

  it('no repite la misma reserva', () => {
    const ids = clases.map((c) => c.entryId);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('reconoce los tipos de clase que declara MRBS', () => {
    const tipos = new Set(clases.map((c) => c.tipo));

    expect(tipos.has('teoria')).toBe(true);
    expect(tipos.has('practica')).toBe(true);
    expect(tipos.has('teorico_practica')).toBe(true);
  });
});

describe('parsearDia ante HTML inesperado', () => {
  it('rechaza un día distinto al pedido', () => {
    expect(() => parsearDia(HTML_REAL, '2026-08-19')).toThrow(/devolvió el día 2026-08-18/);
  });

  it('expone la fecha que declara MRBS para que el caller decida', () => {
    // Los domingos están deshabilitados y el server redirige al día siguiente:
    // el scrapper lo trata como "sin clases", no como error.
    const { fechaDeclarada } = parsearDiaDetallado(HTML_REAL, '2026-08-19');

    expect(fechaDeclarada).toBe('2026-08-18');
  });

  it('avisa si no hay grilla', () => {
    expect(() => parsearDia('<html><body></body></html>', FECHA)).toThrow(
      /No se encontraron aulas/,
    );
  });

  it('falla si las columnas no cierran, en vez de guardar aulas equivocadas', () => {
    // Se le saca un rowspan a una clase: a partir de ahí la fila se corre una columna.
    const roto = HTML_REAL.replace('rowspan="4"', 'rowspan="1"');

    expect(() => parsearDia(roto, FECHA)).toThrow(/no quedó alineada/);
  });
});
