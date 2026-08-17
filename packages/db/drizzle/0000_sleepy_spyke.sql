CREATE TYPE "public"."tipo_clase" AS ENUM('teoria', 'practica', 'teorico_practica', 'otro');--> statement-breakpoint
CREATE TYPE "public"."rol_mensaje" AS ENUM('usuario', 'asistente', 'sistema');--> statement-breakpoint
CREATE TABLE "cursadas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_id" text NOT NULL,
	"fecha" date NOT NULL,
	"dia_semana" smallint NOT NULL,
	"hora_inicio" time NOT NULL,
	"hora_fin" time NOT NULL,
	"materia" text NOT NULL,
	"titulo_crudo" text NOT NULL,
	"tipo" "tipo_clase" NOT NULL,
	"comision" text,
	"aula" text NOT NULL,
	"capacidad" integer,
	"scrapeado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jid" text NOT NULL,
	"nombre" text,
	"creada_en" timestamp with time zone DEFAULT now() NOT NULL,
	"ultimo_mensaje_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conversaciones_jid_unique" UNIQUE("jid")
);
--> statement-breakpoint
CREATE TABLE "mensajes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversacion_id" uuid NOT NULL,
	"rol" "rol_mensaje" NOT NULL,
	"contenido" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mensajes" ADD CONSTRAINT "mensajes_conversacion_id_conversaciones_id_fk" FOREIGN KEY ("conversacion_id") REFERENCES "public"."conversaciones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cursadas_entry_fecha_idx" ON "cursadas" USING btree ("entry_id","fecha");--> statement-breakpoint
CREATE INDEX "cursadas_fecha_idx" ON "cursadas" USING btree ("fecha","hora_inicio");--> statement-breakpoint
CREATE INDEX "cursadas_materia_idx" ON "cursadas" USING gin (to_tsvector('spanish', "materia"));--> statement-breakpoint
CREATE INDEX "conversaciones_ultimo_mensaje_idx" ON "conversaciones" USING btree ("ultimo_mensaje_en");--> statement-breakpoint
CREATE INDEX "mensajes_conversacion_idx" ON "mensajes" USING btree ("conversacion_id","creado_en");