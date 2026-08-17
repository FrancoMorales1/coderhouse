/** La Facultad está en Mar del Plata; el server puede estar en UTC. */
export const ZONA_ARGENTINA = 'America/Argentina/Buenos_Aires';

const NOMBRES_DIA = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
] as const;

/**
 * Fecha `YYYY-MM-DD` en la zona indicada.
 * El locale `sv-SE` ya formatea ISO, así que no hay que rearmar nada a mano.
 */
export function fechaEnZona(momento: Date, zona = ZONA_ARGENTINA): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: zona,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(momento);
}

/** Suma días a una fecha ISO sin tocar zonas horarias (aritmética en UTC puro). */
export function sumarDias(fecha: string, dias: number): string {
  const base = new Date(`${fecha}T12:00:00Z`);
  base.setUTCDate(base.getUTCDate() + dias);
  return base.toISOString().slice(0, 10);
}

/** Las `cantidad` fechas a partir de `desde`, incluida. */
export function proximasFechas(desde: string, cantidad: number): string[] {
  return Array.from({ length: Math.max(0, cantidad) }, (_, i) => sumarDias(desde, i));
}

/** 0 = domingo … 6 = sábado. Mediodía UTC para que ningún huso cruce de día. */
export function diaSemanaDe(fecha: string): number {
  return new Date(`${fecha}T12:00:00Z`).getUTCDay();
}

export function nombreDiaSemana(dia: number): string {
  return NOMBRES_DIA[dia] ?? 'desconocido';
}
