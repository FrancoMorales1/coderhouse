import { db } from '@fi/db';
import { fechaEnZona, nombreDiaSemana, sumarDias } from '@fi/scrapper';
import { sql } from 'drizzle-orm';

import type { FragmentoContexto } from '@fi/ai';

import type { NumeroOpcion } from './menu.js';

const MAX_CLASES = 30;
const MAX_FRAGMENTOS_MATERIAL = 3;
const MAX_CHARS_MATERIAL = 3_000;

// ── Horarios ─────────────────────────────────────────────────────────────────

interface FilaCursada extends Record<string, unknown> {
  fecha: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  materia: string;
  titulo_crudo: string;
  tipo: string;
  comision: string | null;
  aula: string;
}

const ETIQUETA_TIPO: Record<string, string> = {
  teoria: 'teoría',
  practica: 'práctica',
  teorico_practica: 'teórico-práctica',
  otro: '',
};

function describir(fila: FilaCursada): string {
  const dia = nombreDiaSemana(fila.dia_semana);
  const tipo = ETIQUETA_TIPO[fila.tipo] ?? '';
  const detalle = [tipo, fila.comision ? `comisión ${fila.comision}` : '']
    .filter(Boolean)
    .join(', ');

  return (
    `${fila.titulo_crudo} — ${dia} ${fila.fecha}, de ${fila.hora_inicio.slice(0, 5)} ` +
    `a ${fila.hora_fin.slice(0, 5)}, en ${fila.aula}${detalle ? ` (${detalle})` : ''}`
  );
}

/**
 * Busca clases por full-text en español, acotado a los próximos 7 días.
 * Si la consulta no matchea nada, devuelve toda la agenda del rango.
 */
async function buscarHorarios(consulta: string): Promise<FragmentoContexto[]> {
  const hoy = fechaEnZona(new Date());
  const hasta = sumarDias(hoy, 7);

  const porMateria =
    consulta.length > 0
      ? await db.execute<FilaCursada>(sql`
          SELECT fecha, dia_semana, hora_inicio, hora_fin, materia, titulo_crudo, tipo, comision, aula
          FROM cursadas
          WHERE fecha >= ${hoy} AND fecha <= ${hasta}
            AND to_tsvector('spanish', materia) @@ plainto_tsquery('spanish', ${consulta})
          ORDER BY fecha, hora_inicio
          LIMIT ${MAX_CLASES}
        `)
      : { rows: [] };

  const filas =
    porMateria.rows.length > 0
      ? porMateria.rows
      : (
          await db.execute<FilaCursada>(sql`
            SELECT fecha, dia_semana, hora_inicio, hora_fin, materia, titulo_crudo, tipo, comision, aula
            FROM cursadas
            WHERE fecha >= ${hoy} AND fecha <= ${hasta}
            ORDER BY fecha, hora_inicio
            LIMIT ${MAX_CLASES}
          `)
        ).rows;

  if (filas.length === 0) return [];

  return [
    {
      titulo: `Horarios de cursadas del ${hoy} al ${hasta}`,
      url: 'https://salas.fi.mdp.edu.ar/',
      contenido: filas.map(describir).join('\n'),
    },
  ];
}

// ── Material ──────────────────────────────────────────────────────────────────

interface FilaMaterial extends Record<string, unknown> {
  titulo: string;
  contenido: string;
}

async function buscarEnMaterial(
  categorias: string[],
  consulta: string,
): Promise<FragmentoContexto[]> {
  const filas =
    consulta.length > 0
      ? await db.execute<FilaMaterial>(sql`
          SELECT titulo, contenido
          FROM material
          WHERE categoria = ANY(${categorias}::text[])
            AND to_tsvector('spanish', titulo || ' ' || contenido)
                @@ plainto_tsquery('spanish', ${consulta})
          ORDER BY ts_rank(
            to_tsvector('spanish', titulo || ' ' || contenido),
            plainto_tsquery('spanish', ${consulta})
          ) DESC
          LIMIT ${MAX_FRAGMENTOS_MATERIAL}
        `)
      : await db.execute<FilaMaterial>(sql`
          SELECT titulo, contenido
          FROM material
          WHERE categoria = ANY(${categorias}::text[])
          LIMIT ${MAX_FRAGMENTOS_MATERIAL}
        `);

  return filas.rows.map((fila) => ({
    titulo: fila.titulo,
    url: 'https://www.fi.mdp.edu.ar/',
    contenido: fila.contenido.slice(0, MAX_CHARS_MATERIAL),
  }));
}

// ── Router por opción de menú ─────────────────────────────────────────────────

export async function obtenerContextoDeOpcion(
  opcion: NumeroOpcion,
  consulta: string,
): Promise<FragmentoContexto[]> {
  switch (opcion) {
    case 1:
      return buscarHorarios(consulta);
    case 2:
      return buscarEnMaterial(['calendario'], consulta);
    case 3:
      return buscarEnMaterial(['plan_estudios'], consulta);
    case 4:
      return buscarEnMaterial(['infraestructura', 'enlace', 'grupo_wpp'], consulta);
  }
}
