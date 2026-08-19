import { describe, expect, it } from 'vitest';

import { terminosDeBusqueda, tsqueryOr } from './busqueda.js';

describe('terminosDeBusqueda', () => {
  it('separa la consulta en palabras', () => {
    expect(terminosDeBusqueda('Análisis Matemático I')).toEqual(['análisis', 'matemático', 'i']);
  });

  it('descarta los operadores de tsquery que escriba el usuario', () => {
    expect(terminosDeBusqueda("fisica & !algebra | 'x':*")).toEqual(['fisica', 'algebra', 'x']);
  });

  it('devuelve una lista vacía si no hay nada aprovechable', () => {
    expect(terminosDeBusqueda('   ---   ')).toEqual([]);
  });
});

describe('tsqueryOr', () => {
  it('une los términos con OR', () => {
    expect(tsqueryOr('seguridad informatica')).toBe('seguridad | informatica');
  });

  it('devuelve null cuando no queda ningún término', () => {
    // to_tsquery('') es un error de sintaxis en Postgres: hay que no consultar.
    expect(tsqueryOr('- .')).toBeNull();
  });
});
