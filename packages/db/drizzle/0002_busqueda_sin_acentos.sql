-- Búsqueda de texto insensible a acentos.
--
-- El diccionario `spanish` de Postgres stemea pero NO normaliza acentos:
--   to_tsvector('spanish', 'informática') -> 'informát'
--   to_tsvector('spanish', 'informatica') -> 'informat'
-- Nunca matchean entre sí. Como MRBS guarda los títulos tal cual los tipeó cada
-- docente (conviven "Introducción a la Matemática Discreta" y "introduccion al
-- modelado computacional"), la búsqueda fallaba en las dos direcciones.
--
-- `espanol_sin_acentos` = spanish + unaccent. Los índices GIN se reconstruyen
-- con esta config y sobre materia + titulo_crudo (MRBS abrevia bastante, así
-- que el crudo aporta términos que la normalización se come).

CREATE EXTENSION IF NOT EXISTS unaccent;--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_ts_config c
    JOIN pg_namespace n ON n.oid = c.cfgnamespace
    WHERE c.cfgname = 'espanol_sin_acentos' AND n.nspname = 'public'
  ) THEN
    EXECUTE 'CREATE TEXT SEARCH CONFIGURATION public.espanol_sin_acentos (COPY = pg_catalog.spanish)';
    EXECUTE 'ALTER TEXT SEARCH CONFIGURATION public.espanol_sin_acentos
               ALTER MAPPING FOR hword, hword_part, word
               WITH unaccent, spanish_stem';
  END IF;
END $$;--> statement-breakpoint

DROP INDEX IF EXISTS "cursadas_materia_idx";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cursadas_busqueda_idx" ON "cursadas" USING gin (to_tsvector('public.espanol_sin_acentos', "materia" || ' ' || "titulo_crudo"));--> statement-breakpoint
DROP INDEX IF EXISTS "material_fts_idx";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "material_busqueda_idx" ON "material" USING gin (to_tsvector('public.espanol_sin_acentos', "titulo" || ' ' || "contenido"));
