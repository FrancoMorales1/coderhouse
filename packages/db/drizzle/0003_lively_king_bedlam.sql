CREATE TABLE "planes_estudio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"carrera" text NOT NULL,
	"version" text NOT NULL,
	"anio" smallint NOT NULL,
	"etiqueta" text NOT NULL,
	"archivo" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "planes_estudio_etiqueta_idx" ON "planes_estudio" USING btree ("etiqueta");--> statement-breakpoint
CREATE UNIQUE INDEX "planes_estudio_carrera_version_idx" ON "planes_estudio" USING btree ("carrera","version");