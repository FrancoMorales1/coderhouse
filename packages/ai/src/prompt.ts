import type { ConsultaIA, FragmentoContexto, TurnoConversacion } from './types.js';

export const INSTRUCCION_SISTEMA = `Sos el asistente virtual de la Facultad de Ingeniería de la Universidad Nacional de Mar del Plata (UNMdP).

Por ahora respondés UN SOLO tema: horarios de cursadas (qué día, a qué hora y en qué aula).

Reglas:
1. Respondé ÚNICAMENTE con la información del CONTEXTO. No inventes ni deduzcas días, horarios ni aulas.
2. Si preguntan otra cosa (inscripciones, trámites, finales, correlativas), aclará amablemente que por ahora solo sabés de horarios de cursadas y derivá a la web oficial o a Alumnos.
3. Si la materia no aparece en el contexto, decilo: puede no tener clases en los próximos días o llamarse distinto en el sistema. Nunca completes con lo que te parezca.
4. Los horarios salen del sistema de reserva de salas y son los de los próximos días; si el alumno pregunta por algo más lejano, avisale que solo tenés esa ventana cargada.
5. Escribí en español rioplatense, cordial y breve (WhatsApp, no un informe).
6. Máximo 4 párrafos cortos. Sin markdown pesado: WhatsApp solo entiende *negrita* y _cursiva_.
7. Cuando des un horario, incluí siempre día, hora y aula.`;

const MAX_CARACTERES_POR_DOCUMENTO = 4_000;

function renderDocumentos(documentos: FragmentoContexto[]): string {
  if (documentos.length === 0) {
    return 'No hay horarios cargados para esta consulta en la base de conocimiento.';
  }

  return documentos
    .map((doc, i) => {
      const contenido = doc.contenido.slice(0, MAX_CARACTERES_POR_DOCUMENTO);
      return `[${String(i + 1)}] ${doc.titulo}\nFuente: ${doc.url}\n${contenido}`;
    })
    .join('\n\n---\n\n');
}

function renderHistorial(historial: TurnoConversacion[]): string {
  if (historial.length === 0) return 'Es el primer mensaje de la conversación.';

  return historial
    .map((turno) => `${turno.rol === 'usuario' ? 'Usuario' : 'Asistente'}: ${turno.contenido}`)
    .join('\n');
}

/**
 * Arma el prompt final. Es una función pura a propósito:
 * se puede testear sin pegarle a la API de Gemini.
 */
export function construirPrompt(consulta: ConsultaIA): string {
  return [
    '## CONTEXTO (horarios de cursadas de la Facultad)',
    renderDocumentos(consulta.documentos),
    '',
    '## HISTORIAL DE LA CONVERSACIÓN',
    renderHistorial(consulta.historial),
    '',
    '## CONSULTA ACTUAL',
    consulta.mensaje,
  ].join('\n');
}

export function extraerFuentes(documentos: FragmentoContexto[]): string[] {
  return [...new Set(documentos.map((doc) => doc.url))];
}
