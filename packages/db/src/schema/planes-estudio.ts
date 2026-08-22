import { pgTable, smallint, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

/**
 * Metadata de los planes de estudio: qué carreras existen, qué versiones tiene
 * cada una y en qué archivo de material/Plan de estudios/ está el PDF. No
 * guarda el contenido: se lee del disco al momento de responder.
 */
export const planesEstudio = pgTable(
  'planes_estudio',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    /** Nombre de la carrera, tal como se muestra en el botón. */
    carrera: text('carrera').notNull(),

    /** "Plan 2003", "Plan 2010", "Plan 2024"... el texto del botón de versión. */
    version: text('version').notNull(),

    /** Año del plan, para poder ordenar las versiones sin depender del texto. */
    anio: smallint('anio').notNull(),

    /** carrera + version combinados: clave única para buscar un plan puntual. */
    etiqueta: text('etiqueta').notNull(),

    /** Nombre exacto del PDF en material/Plan de estudios/. */
    archivo: text('archivo').notNull(),

    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('planes_estudio_etiqueta_idx').on(table.etiqueta),
    uniqueIndex('planes_estudio_carrera_version_idx').on(table.carrera, table.version),
  ],
);

export type PlanEstudio = typeof planesEstudio.$inferSelect;
export type NuevoPlanEstudio = typeof planesEstudio.$inferInsert;
