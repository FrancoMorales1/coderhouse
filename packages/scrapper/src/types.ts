export type TipoClase = 'teoria' | 'practica' | 'teorico_practica' | 'otro';

/** Una clase leída de la grilla de MRBS, ya normalizada. */
export interface ClaseScrapeada {
  entryId: string;
  /** ISO `YYYY-MM-DD`. */
  fecha: string;
  /** 0 = domingo … 6 = sábado. */
  diaSemana: number;
  /** `HH:MM`. */
  horaInicio: string;
  horaFin: string;
  materia: string;
  tituloCrudo: string;
  tipo: TipoClase;
  comision: string | undefined;
  aula: string;
  capacidad: number | undefined;
}

/** Lo que se saca del título de MRBS: "analisis matematico I (P) A2". */
export interface TituloParseado {
  materia: string;
  tipo: TipoClase;
  comision: string | undefined;
}

export interface OpcionesScrapper {
  /** Cuántos días hacia adelante traer, contando desde hoy. */
  dias?: number;
  /** Área de MRBS. 2 = CLASES PRESENCIALES. */
  area?: number;
  baseUrl?: string;
}
