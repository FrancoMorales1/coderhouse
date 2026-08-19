import { sql } from 'drizzle-orm';

/**
 * Configuración de búsqueda de texto creada en la migración
 * `0002_busqueda_sin_acentos`: es `spanish` + `unaccent`.
 *
 * MRBS guarda los títulos como los tipeó cada docente, así que en la misma
 * grilla conviven "Introducción a la Matemática Discreta" y "introduccion al
 * modelado computacional". El diccionario `spanish` pelado NO normaliza
 * acentos (`informática` → `informát`, `informatica` → `informat`), con lo cual
 * la mitad de las búsquedas de los alumnos no matcheaba nunca.
 *
 * Va como literal y no como bind param a propósito: los índices GIN están
 * construidos con esta misma constante y Postgres solo los usa si la config
 * aparece como constante en la consulta.
 */
export const FTS = sql.raw(`'public.espanol_sin_acentos'`);

/**
 * Parte la consulta del alumno en términos aptos para `to_tsquery`.
 *
 * Solo deja letras y números: así el texto libre nunca puede colar operadores
 * de tsquery (`&`, `|`, `!`, `:*`, paréntesis) y romper la consulta.
 */
export function terminosDeBusqueda(consulta: string): string[] {
  return consulta.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

/**
 * Arma una tsquery con OR entre todos los términos.
 *
 * Es el segundo intento de búsqueda: `plainto_tsquery` exige que estén *todas*
 * las palabras, y por eso "seguridad informatica" no encontraba "seguridad
 * higiene y medio ambiente". Con OR aparece, y el ranking la deja arriba.
 *
 * Devuelve null si no quedó ningún término utilizable, porque `to_tsquery('')`
 * es un error de sintaxis en Postgres.
 */
export function tsqueryOr(consulta: string): string | null {
  const terminos = terminosDeBusqueda(consulta);
  return terminos.length > 0 ? terminos.join(' | ') : null;
}
