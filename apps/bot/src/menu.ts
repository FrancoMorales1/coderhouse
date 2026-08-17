export type NumeroOpcion = 1 | 2 | 3 | 4;

export interface OpcionSeleccionada {
  numero: NumeroOpcion;
  /** Texto libre que el usuario agregó después del número. Puede ser vacío. */
  consulta: string;
}

export const TEXTO_MENU = `Soy el asistente de la Facultad de Ingeniería (UNMdP).

Elegí una opción:

1 - Horarios de cursadas
2 - Calendario académico 2026
3 - Plan de estudios
4 - Información de la facultad

Respondé con el número. Para buscar algo específico, agregalo después. Ejemplo: *1 análisis matemático*`;

/**
 * Detecta si el mensaje es una selección de menú.
 * Acepta "1", "2 informatica", "3 ingeniería química", etc.
 * Cualquier otra cosa devuelve null → mostrar el menú.
 */
export function parsearOpcion(mensaje: string): OpcionSeleccionada | null {
  const match = /^([1-4])\b\s*([\s\S]*)$/.exec(mensaje.trim());
  if (!match) return null;
  return {
    numero: Number(match[1]) as NumeroOpcion,
    consulta: match[2].trim(),
  };
}

/**
 * Convierte la opción + consulta en una pregunta natural para pasarle a la IA.
 * Así Gemini recibe contexto claro sobre qué se está preguntando.
 */
export function mensajeParaIA(opcion: OpcionSeleccionada): string {
  const { numero, consulta } = opcion;

  switch (numero) {
    case 1:
      return consulta
        ? `¿Cuándo son los horarios de ${consulta}?`
        : '¿Cuáles son los horarios de cursadas para los próximos días?';
    case 2:
      return consulta
        ? `¿Qué dice el calendario académico sobre ${consulta}?`
        : '¿Cuáles son las fechas importantes del calendario académico 2026?';
    case 3:
      return consulta
        ? `¿Cómo es el plan de estudios de ${consulta}?`
        : '¿Qué carreras hay y cómo son sus planes de estudio?';
    case 4:
      return consulta
        ? `¿Dónde encuentro información sobre ${consulta}?`
        : '¿Cuáles son los grupos de WhatsApp, enlaces y servicios de la facultad?';
  }
}
