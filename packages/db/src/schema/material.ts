import { sql } from 'drizzle-orm';
import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * Base de conocimiento estática: calendario, planes de estudio,
 * infraestructura, grupos de WhatsApp y enlaces.
 * Poblada con scripts/seed-material.mjs.
 */
export const material = pgTable(
  'material',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    /** 'calendario' | 'plan_estudios' | 'infraestructura' | 'enlace' | 'grupo_wpp' */
    categoria: text('categoria').notNull(),

    /** Carrera para plan_estudios; año para calendario; null en el resto. */
    subcategoria: text('subcategoria'),

    titulo: text('titulo').notNull(),
    contenido: text('contenido').notNull(),

    /** Nombre del archivo origen. Null para filas cargadas manualmente. */
    fuente: text('fuente'),

    cargadoEn: timestamp('cargado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('material_categoria_idx').on(table.categoria),
    index('material_busqueda_idx').using(
      'gin',
      sql`to_tsvector('public.espanol_sin_acentos', ${table.titulo} || ' ' || ${table.contenido})`,
    ),
  ],
);

export type Material = typeof material.$inferSelect;
export type NuevoMaterial = typeof material.$inferInsert;
