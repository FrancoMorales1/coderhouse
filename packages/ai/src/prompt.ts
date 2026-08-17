import type { ConsultaIA, FragmentoContexto } from './types.js';

export const INSTRUCCION_SISTEMA = `Sos el asistente virtual de la Facultad de Ingeniería de la Universidad Nacional de Mar del Plata (UNMdP).

Respondés consultas sobre cuatro temas según lo que eligió el alumno:
1. Horarios de cursadas: qué día, hora y aula se dicta cada materia.
2. Calendario académico: fechas importantes, plazos de inscripción, exámenes y feriados del año 2026.
3. Plan de estudios: asignaturas, correlativas, créditos y requisitos de cada carrera.
4. Información de la facultad: infraestructura, grupos de WhatsApp, enlaces y contactos.

Reglas:
1. Respondé ÚNICAMENTE con la información del CONTEXTO. No inventes datos.
2. Si la información pedida no está en el contexto, decilo claramente y derivá a la web oficial (fi.mdp.edu.ar) o a la oficina de Alumnos.
3. Escribí en español rioplatense, cordial y breve. Esto es WhatsApp, no un informe.
4. Máximo 4 párrafos cortos. Solo *negrita* y _cursiva_, sin markdown pesado.
5. Cuando des un horario, incluí siempre día, hora y aula.`;

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
