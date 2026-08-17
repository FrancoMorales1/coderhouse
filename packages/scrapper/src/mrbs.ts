import { ScrapperError, createLogger, env } from '@fi/core';

import { fechaEnZona, nombreDiaSemana, diaSemanaDe, proximasFechas } from './fechas.js';
import { parsearDiaDetallado } from './parseo.js';

import type { ClaseScrapeada, OpcionesScrapper } from './types.js';

const log = createLogger('scrapper');

/** Pausa entre requests: es el servidor de la Facultad, no lo apuramos. */
const PAUSA_MS = 500;

export function construirUrl(baseUrl: string, fecha: string, area: number): string {
  const url = new URL(baseUrl);
  url.searchParams.set('view', 'day');
  url.searchParams.set('view_all', '1');
  url.searchParams.set('page_date', fecha);
  url.searchParams.set('area', String(area));
  return url.toString();
}

async function bajarDia(baseUrl: string, fecha: string, area: number): Promise<ClaseScrapeada[]> {
  const url = construirUrl(baseUrl, fecha, area);
  const respuesta = await fetch(url, {
    headers: { 'user-agent': 'bot-fi-unmdp/0.1 (asistente de horarios)' },
    signal: AbortSignal.timeout(30_000),
  });

  if (!respuesta.ok) {
    throw new ScrapperError(`MRBS respondió ${String(respuesta.status)} para ${fecha}`);
  }

  const { clases, desalineadas, celdasVerificadas, fechaDeclarada } = parsearDiaDetallado(
    await respuesta.text(),
    fecha,
  );

  // MRBS redirige al día siguiente cuando el pedido está deshabilitado (los
  // domingos). No es un error: ese día simplemente no tiene clases.
  if (fechaDeclarada && fechaDeclarada !== fecha) {
    log.info(
      { fecha, devolvio: fechaDeclarada, dia: nombreDiaSemana(diaSemanaDe(fecha)) },
      'MRBS no tiene ese día habilitado; se registra sin clases',
    );
    return [];
  }

  // Equivocarse de columna es decirle a un alumno un aula que no es.
  if (desalineadas > 0) {
    throw new ScrapperError(
      `La grilla de MRBS no quedó alineada el ${fecha}: ` +
        `${String(desalineadas)} de ${String(celdasVerificadas)} celdas libres no coinciden ` +
        'con su columna. Probablemente cambió el HTML del sistema de salas.',
    );
  }

  return clases;
}

/**
 * Trae los horarios de los próximos días desde el sistema de salas.
 * Un día que falla no tumba la corrida: se loguea y se sigue con el resto.
 */
export async function scrapearHorarios(opciones: OpcionesScrapper = {}): Promise<{
  clases: ClaseScrapeada[];
  /** Solo las fechas que se bajaron bien: son las únicas que se pueden reemplazar. */
  fechasOk: string[];
  fallidas: string[];
}> {
  const dias = opciones.dias ?? env.SCRAPPER_DIAS;
  const area = opciones.area ?? env.SCRAPPER_AREA;
  const baseUrl = opciones.baseUrl ?? env.SCRAPPER_BASE_URL;

  const fechas = proximasFechas(fechaEnZona(new Date()), dias);
  const clases: ClaseScrapeada[] = [];
  const fechasOk: string[] = [];
  const fallidas: string[] = [];

  for (const [indice, fecha] of fechas.entries()) {
    try {
      const delDia = await bajarDia(baseUrl, fecha, area);
      clases.push(...delDia);
      fechasOk.push(fecha);
      log.debug({ fecha, clases: delDia.length }, 'Día scrapeado');
    } catch (error) {
      fallidas.push(fecha);
      log.warn({ err: error, fecha }, 'No se pudo scrapear el día');
    }

    if (indice < fechas.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, PAUSA_MS));
    }
  }

  if (clases.length === 0) {
    throw new ScrapperError('El scrapeo no devolvió ninguna clase; se deja la base como estaba');
  }

  log.info({ dias: fechas.length, clases: clases.length, fallidas }, 'Scraping terminado');
  return { clases, fechasOk, fallidas };
}
