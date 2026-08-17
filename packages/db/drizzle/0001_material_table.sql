CREATE TABLE "material" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"categoria" text NOT NULL,
	"subcategoria" text,
	"titulo" text NOT NULL,
	"contenido" text NOT NULL,
	"fuente" text,
	"cargado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "material_categoria_idx" ON "material" USING btree ("categoria");--> statement-breakpoint
CREATE INDEX "material_fts_idx" ON "material" USING gin (to_tsvector('spanish', "titulo" || ' ' || "contenido"));
