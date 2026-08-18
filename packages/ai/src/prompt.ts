import type { ConsultaIA, FragmentoContexto } from './types.js';

/** Reglas que aplican a todas las opciones: idioma, tono y formato WhatsApp. */
const INSTRUCCION_BASE = `Sos el asistente virtual de la Facultad de Ingeniería de la Universidad Nacional de Mar del Plata (UNMdP).

Reglas:
1. Respondé ÚNICAMENTE con la información del CONTEXTO. No inventes datos.
2. Si la información pedida no está en el contexto, decilo claramente y derivá a la web oficial (fi.mdp.edu.ar) o a la oficina de Alumnos.
3. Escribí en español rioplatense, cordial y breve. Esto es WhatsApp, no un informe.
4. Máximo 4 párrafos cortos. Solo *negrita* y _cursiva_, sin markdown pesado.`;

/** Instrucción de dominio específica para cada opción del menú. */
export const INSTRUCCION_POR_OPCION = {
  1: 'Respondés sobre horarios de cursadas. Cuando des un horario, incluí siempre día, hora y aula.',
  2: 'Respondés sobre el calendario académico 2026: fechas de inscripción, períodos de exámenes, feriados y plazos administrativos.',
  3: 'Respondés sobre planes de estudio: asignaturas, correlativas, créditos y requisitos de egreso de cada carrera.',
  4: 'Respondés sobre infraestructura, grupos de WhatsApp, enlaces y contactos de la facultad.',
} as const satisfies Record<1 | 2 | 3 | 4, string>;

export type NumeroOpcionIA = keyof typeof INSTRUCCION_POR_OPCION;

/** Combina la instrucción base con la específica del dominio elegido. */
export function instruccionParaOpcion(opcion: NumeroOpcionIA): string {
  return `${INSTRUCCION_BASE}\n\n${INSTRUCCION_POR_OPCION[opcion]}`;
}

// ─────────────────────────────────────────────────────────────────────────────

const MAX_CARACTERES_POR_DOCUMENTO = 4_000;

function renderDocumentos(documentos: FragmentoContexto[]): string {
  if (documentos.length === 0) {
    return 'No hay información disponible en la base de conocimiento para esta consulta.';
  }

  return documentos
    .map((doc, i) => {
      const contenido = doc.contenido.slice(0, MAX_CARACTERES_POR_DOCUMENTO);
      return `[${String(i + 1)}] ${doc.titulo}\nFuente: ${doc.url}\n${contenido}`;
    })
    .join('\n\n---\n\n');
}

/**
 * Arma el prompt final. Función pura: testeable sin llamar a la API.
 */
export function construirPrompt(consulta: ConsultaIA): string {
  return [
    '## CONTEXTO (base de conocimiento de la Facultad)',
    renderDocumentos(consulta.documentos),
    '',
    '## CONSULTA ACTUAL',
    consulta.mensaje,
  ].join('\n');
}

export function extraerFuentes(documentos: FragmentoContexto[]): string[] {
  return [...new Set(documentos.map((doc) => doc.url))];
}
