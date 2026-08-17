import { index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const rolMensaje = pgEnum('rol_mensaje', ['usuario', 'asistente', 'sistema']);

/** Un chat de WhatsApp, identificado por su JID. */
export const conversaciones = pgTable(
  'conversaciones',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    jid: text('jid').notNull().unique(),
    nombre: text('nombre'),
    creadaEn: timestamp('creada_en', { withTimezone: true }).notNull().defaultNow(),
    ultimoMensajeEn: timestamp('ultimo_mensaje_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('conversaciones_ultimo_mensaje_idx').on(table.ultimoMensajeEn)],
);

/** Historial: es el "contexto" que acompaña a cada consulta a la IA. */
export const mensajes = pgTable(
  'mensajes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversacionId: uuid('conversacion_id')
      .notNull()
      .references(() => conversaciones.id, { onDelete: 'cascade' }),
    rol: rolMensaje('rol').notNull(),
    contenido: text('contenido').notNull(),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('mensajes_conversacion_idx').on(table.conversacionId, table.creadoEn)],
);

export type Conversacion = typeof conversaciones.$inferSelect;
export type NuevaConversacion = typeof conversaciones.$inferInsert;
export type Mensaje = typeof mensajes.$inferSelect;
export type NuevoMensaje = typeof mensajes.$inferInsert;
