import type { TipoClase, TituloParseado } from './types.js';

/**
 * MRBS mete el tipo de clase entre paréntesis, con formato bastante libre:
 *   "analisis matematico I(P)A2"   "informatica basica-T"
 *   "analisis matematico III ( T) A2"   "Física A (TP)-TM"
 * Este regex tolera espacios internos y los separadores T-P / T/P.
 */
const TIPO_ENTRE_PARENTESIS = /\(\s*(t\s*[-/]?\s*p|tp|t|p)\s*\)/i;
/** Variante sin paréntesis, pegada con guión al final: "informatica basica-T". */
const TIPO_CON_GUION = /-\s*(tp|t|p)\s*$/i;

function clasificar(marca: string): TipoClase {
  const limpio = marca.toLowerCase().replace(/[\s\-/]/g, '');
  if (limpio === 'tp') return 'teorico_practica';
  if (limpio === 't') return 'teoria';
  if (limpio === 'p') return 'practica';
  return 'otro';
}

/** Minúsculas, sin espacios de más ni puntuación colgando de los bordes. */
export function normalizarMateria(texto: string): string {
  return texto
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-–:.,]+|[\s\-–:.,]+$/g, '')
    .trim();
}

function limpiarComision(resto: string): string | undefined {
  const limpio = resto
    .replace(/^[\s\-–:.,]+|[\s\-–:.,]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return limpio ? limpio : undefined;
}

/**
 * Desarma el nombre de una reserva de MRBS en materia, tipo y comisión.
 * Lo que no matchea ningún patrón conocido queda como `otro` con la materia
 * entera: preferimos guardarlo tal cual antes que descartar información.
 */
export function parsearTitulo(crudo: string): TituloParseado {
  const texto = crudo.replace(/\s+/g, ' ').trim();

  const conParentesis = TIPO_ENTRE_PARENTESIS.exec(texto);
  if (conParentesis) {
    const antes = texto.slice(0, conParentesis.index);
    const despues = texto.slice(conParentesis.index + conParentesis[0].length);

    return {
      materia: normalizarMateria(antes),
      tipo: clasificar(conParentesis[1] ?? ''),
      comision: limpiarComision(despues),
    };
  }

  const conGuion = TIPO_CON_GUION.exec(texto);
  if (conGuion) {
    return {
      materia: normalizarMateria(texto.slice(0, conGuion.index)),
      tipo: clasificar(conGuion[1] ?? ''),
      comision: undefined,
    };
  }

  return { materia: normalizarMateria(texto), tipo: 'otro', comision: undefined };
}
