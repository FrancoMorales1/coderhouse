import * as cheerio from 'cheerio';

import { diaSemanaDe } from './fechas.js';
import { parsearTitulo } from './titulo.js';

import type { ClaseScrapeada } from './types.js';

interface Aula {
  /** Id de sala en MRBS; se usa para verificar que la columna sea la correcta. */
  room: string;
  nombre: string;
  capacidad: number | undefined;
}

/** Segundos desde medianoche -> "HH:MM". */
export function segundosAHora(segundos: number): string {
  const total = ((segundos % 86_400) + 86_400) % 86_400;
  const hh = Math.floor(total / 3600);
  const mm = Math.floor((total % 3600) / 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function leerAulas($: cheerio.CheerioAPI): Aula[] {
  return $('#day_main thead th[data-room]')
    .toArray()
    .map((th) => {
      const $th = $(th);
      const $capacidad = $th.find('span.capacity');
      const capacidad = Number.parseInt($capacidad.text().trim(), 10);

      // Nombre y capacidad comparten el mismo <a>:
      // "Aula 01<span class="capacity">80</span>". Sacando el span queda el nombre.
      $capacidad.remove();

      return {
        room: $th.attr('data-room') ?? '',
        nombre: $th.text().replace(/\s+/g, ' ').trim(),
        capacidad: Number.isNaN(capacidad) ? undefined : capacidad,
      };
    });
}

/** Las celdas libres llevan el room en el href de "crear reserva". */
function roomDeCeldaLibre($celda: cheerio.Cheerio<never>): string | undefined {
  const href = $celda.find('a[href*="edit_entry.php"]').first().attr('href');
  return href ? /[?&]room=(\d+)/.exec(href)?.[1] : undefined;
}

export interface ResultadoParseo {
  clases: ClaseScrapeada[];
  /** Celdas libres cuyo room no coincidió con la columna calculada. */
  desalineadas: number;
  celdasVerificadas: number;
  /**
   * El día que MRBS dice haber devuelto. Si no es el pedido, el server redirigió
   * (pasa con los domingos, que están deshabilitados) y los datos son de otra fecha.
   */
  fechaDeclarada: string | undefined;
}

/**
 * Reconstruye la grilla día/aula de MRBS.
 *
 * El problema: una clase de 2 horas se renderiza como un único `<td rowspan="4">`,
 * así que en las 3 filas siguientes esa columna no aparece en el HTML y todos los
 * `<td>` posteriores quedan corridos. La posición del `<td>` dentro del `<tr>` no
 * es la columna real. Se lleva un contador de cuántas filas sigue ocupada cada
 * columna y se saltean esas posiciones, igual que hace el navegador al maquetar.
 *
 * Como equivocarse de columna significa decirle a un alumno un aula que no es, el
 * recorrido se autoverifica: las celdas libres traen su room en el href, así que
 * se compara contra la columna calculada en cada paso.
 */
export function parsearDiaDetallado(html: string, fecha: string): ResultadoParseo {
  const $ = cheerio.load(html);

  const fechaDeclarada = $('body').attr('data-page-date');
  const aulas = leerAulas($);
  if (aulas.length === 0) throw new Error('No se encontraron aulas en la grilla de MRBS');

  const resolucion = Number.parseInt($('#day_main').attr('data-resolution') ?? '1800', 10);
  const diaSemana = diaSemanaDe(fecha);

  /** Filas que a cada columna todavía le quedan ocupadas por un rowspan previo. */
  const ocupadaHasta = new Array<number>(aulas.length).fill(0);
  const clases: ClaseScrapeada[] = [];
  let desalineadas = 0;
  let celdasVerificadas = 0;

  $('#day_main tbody tr').each((_, tr) => {
    const $tr = $(tr);

    const seg = $tr.find('th[data-seconds]').first().attr('data-seconds');
    const segundos = Number.parseInt(seg ?? '', 10);
    if (Number.isNaN(segundos)) return;

    const celdas = $tr.find('td').toArray();
    let siguienteCelda = 0;

    for (let columna = 0; columna < aulas.length; columna += 1) {
      const restantes = ocupadaHasta[columna] ?? 0;
      if (restantes > 0) {
        ocupadaHasta[columna] = restantes - 1;
        continue;
      }

      const celda = celdas[siguienteCelda];
      if (!celda) break;
      siguienteCelda += 1;

      const $celda = $(celda) as cheerio.Cheerio<never>;
      const filas = Number.parseInt($celda.attr('rowspan') ?? '1', 10) || 1;
      ocupadaHasta[columna] = filas - 1;

      const aula = aulas[columna];
      if (!aula) continue;

      const roomLibre = roomDeCeldaLibre($celda);
      if (roomLibre !== undefined) {
        celdasVerificadas += 1;
        if (roomLibre !== aula.room) desalineadas += 1;
        continue;
      }

      // Una celda puede contener más de una reserva superpuesta.
      $celda.find('a[data-id]').each((__, a) => {
        const $a = $(a);
        const entryId = $a.attr('data-id');
        const tituloCrudo = $a.text().replace(/\s+/g, ' ').trim();
        if (!entryId || !tituloCrudo) return;

        const { materia, tipo, comision } = parsearTitulo(tituloCrudo);

        clases.push({
          entryId,
          fecha,
          diaSemana,
          horaInicio: segundosAHora(segundos),
          horaFin: segundosAHora(segundos + filas * resolucion),
          materia,
          tituloCrudo,
          tipo,
          comision,
          aula: aula.nombre,
          capacidad: aula.capacidad,
        });
      });
    }
  });

  return { clases, desalineadas, celdasVerificadas, fechaDeclarada };
}

/**
 * Igual que `parsearDiaDetallado` pero falla si la grilla no quedó alineada o si
 * MRBS devolvió otro día: es preferible una corrida en rojo a guardar datos mal
 * atribuidos. Para tolerar la redirección de los días deshabilitados, usar
 * `parsearDiaDetallado` y decidir según `fechaDeclarada`.
 */
export function parsearDia(html: string, fecha: string): ClaseScrapeada[] {
  const { clases, desalineadas, celdasVerificadas, fechaDeclarada } = parsearDiaDetallado(
    html,
    fecha,
  );

  if (fechaDeclarada && fechaDeclarada !== fecha) {
    throw new Error(`MRBS devolvió el día ${fechaDeclarada} cuando se pidió ${fecha}`);
  }

  if (desalineadas > 0) {
    throw new Error(
      `La grilla de MRBS no quedó alineada el ${fecha}: ` +
        `${String(desalineadas)} de ${String(celdasVerificadas)} celdas libres no coinciden ` +
        'con su columna. Probablemente cambió el HTML del sistema de salas.',
    );
  }

  return clases;
}
