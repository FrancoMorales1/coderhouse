import { conversaciones, db, mensajes } from '@fi/db';
import { fechaEnZona, nombreDiaSemana, sumarDias } from '@fi/scrapper';
import { desc, eq, sql } from 'drizzle-orm';

import type { FragmentoContexto, TurnoConversacion } from '@fi/ai';

const MAX_CLASES = 30;
const MAX_TURNOS_HISTORIAL = 10;

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
 * Busca clases por nombre de materia con full-text en español, acotado a los días
 * que están cargados de hoy en adelante. Si la consulta no matchea nada (el alumno
 * escribió "que tengo mañana"), devuelve la agenda del rango igual, para que el
 * modelo tenga con qué responder.
 */
export async function buscarHorarios(consulta: string): Promise<FragmentoContexto[]> {
  const hoy = fechaEnZona(new Date());
  const hasta = sumarDias(hoy, 7);

  const porMateria = await db.execute<FilaCursada>(sql`
    select fecha, dia_semana, hora_inicio, hora_fin, materia, titulo_crudo, tipo, comision, aula
    from cursadas
    where fecha >= ${hoy} and fecha <= ${hasta}
      and to_tsvector('spanish', materia) @@ plainto_tsquery('spanish', ${consulta})
    order by fecha, hora_inicio
    limit ${MAX_CLASES}
  `);

  const filas =
    porMateria.rows.length > 0
      ? porMateria.rows
      : (
          await db.execute<FilaCursada>(sql`
            select fecha, dia_semana, hora_inicio, hora_fin, materia, titulo_crudo, tipo, comision, aula
            from cursadas
            where fecha >= ${hoy} and fecha <= ${hasta}
            order by fecha, hora_inicio
            limit ${MAX_CLASES}
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

/** Devuelve la conversación del JID, creándola si es la primera vez. */
export async function obtenerConversacion(jid: string, nombre?: string): Promise<string> {
  const [existente] = await db
    .select({ id: conversaciones.id })
    .from(conversaciones)
    .where(eq(conversaciones.jid, jid))
    .limit(1);

  if (existente) {
    await db
      .update(conversaciones)
      .set({ ultimoMensajeEn: new Date() })
      .where(eq(conversaciones.id, existente.id));
    return existente.id;
  }

  const [creada] = await db
    .insert(conversaciones)
    .values({ jid, nombre: nombre ?? null })
    .returning({ id: conversaciones.id });

  if (!creada) throw new Error(`No se pudo crear la conversación para ${jid}`);
  return creada.id;
}

export async function obtenerHistorial(conversacionId: string): Promise<TurnoConversacion[]> {
  const filas = await db
    .select({ rol: mensajes.rol, contenido: mensajes.contenido })
    .from(mensajes)
    .where(eq(mensajes.conversacionId, conversacionId))
    .orderBy(desc(mensajes.creadoEn))
    .limit(MAX_TURNOS_HISTORIAL);

  return filas
    .reverse()
    .filter((fila) => fila.rol !== 'sistema')
    .map((fila) => ({
      rol: fila.rol === 'usuario' ? ('usuario' as const) : ('asistente' as const),
      contenido: fila.contenido,
    }));
}

export async function guardarTurno(
  conversacionId: string,
  rol: 'usuario' | 'asistente',
  contenido: string,
): Promise<void> {
  await db.insert(mensajes).values({ conversacionId, rol, contenido });
}
