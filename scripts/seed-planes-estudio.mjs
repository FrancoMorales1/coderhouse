#!/usr/bin/env node
/**
 * Pobla `planes_estudio` con las carreras y sus versiones de plan de estudios.
 *
 * A diferencia del viejo seed-material.mjs, esto no lee ni parsea ningún PDF:
 * solo guarda metadata (carrera, versión, año, nombre del archivo). El PDF se
 * lee del disco recién cuando un alumno pregunta por ese plan puntual.
 *
 * Prerrequisito: la tabla `planes_estudio` debe existir (correr pnpm db:migrate
 * primero).
 *
 * Uso:
 *   node scripts/seed-planes-estudio.mjs
 *
 * Idempotente: hace upsert por (carrera, version), así que correrlo de nuevo
 * no duplica filas.
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Cargar .env ──────────────────────────────────────────────────────────────

function cargarEnv(desde) {
  let dir = desde;
  for (;;) {
    const candidato = join(dir, '.env');
    if (existsSync(candidato)) {
      for (const linea of readFileSync(candidato, 'utf8').split('\n')) {
        const t = linea.trim();
        if (!t || t.startsWith('#')) continue;
        const idx = t.indexOf('=');
        if (idx === -1) continue;
        const key = t.slice(0, idx).trim();
        const val = t.slice(idx + 1).trim();
        if (!(key in process.env)) process.env[key] = val;
      }
      return;
    }
    const padre = dirname(dir);
    if (padre === dir) break;
    dir = padre;
  }
}

cargarEnv(__dirname);

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL no encontrada. Revisá el .env');
  process.exit(1);
}

// ── Datos: carreras, versiones y el archivo de cada una ────────────────────────
//
// Todas las carreras tienen "Plan 2003" y "Plan 2024", excepto Computación e
// Informática, cuya versión anterior es de 2010. Los nombres de archivo son
// los que están tal cual en material/Plan de estudios/ (incluido el typo sin
// espacio en "PLAN 2003- QUÍMICA.pdf": no se renombra nada acá).

function plan(carrera, anio, archivo) {
  const version = `Plan ${String(anio)}`;
  return { carrera, version, anio, etiqueta: `${carrera} (${version})`, archivo };
}

/** carrera, nombre del archivo en disco, año del plan anterior (2003 en casi todas, 2010 en las dos excepciones). */
const CARRERAS = [
  ['Ingeniería Eléctrica', 'ELÉCTRICA', 2003],
  ['Ingeniería Electromecánica', 'ELECTROMECÁNICA', 2003],
  ['Ingeniería Electrónica', 'ELECTRÓNICA', 2003],
  ['Ingeniería en Alimentos', 'ALIMENTOS', 2003],
  ['Ingeniería en Materiales', 'MATERIALES', 2003],
  ['Ingeniería Industrial', 'INDUSTRIAL', 2003],
  ['Ingeniería Mecánica', 'MECÁNICA', 2003],
  ['Ingeniería Química', 'QUÍMICA', 2003],
  ['Ingeniería en Computación', 'COMPUTACIÓN', 2010],
  ['Ingeniería en Informática', 'INFORMATICA', 2010],
];

// El único archivo con nombre irregular: sin espacio antes del guion.
const archivoPlanAnterior = (nombreArchivo, anio) =>
  nombreArchivo === 'QUÍMICA'
    ? `PLAN ${String(anio)}- ${nombreArchivo}.pdf`
    : `PLAN ${String(anio)} - ${nombreArchivo}.pdf`;

const PLANES = CARRERAS.flatMap(([carrera, nombreArchivo, anioAnterior]) => [
  plan(carrera, anioAnterior, archivoPlanAnterior(nombreArchivo, anioAnterior)),
  plan(carrera, 2024, `PLAN 2024 - ${nombreArchivo}.pdf`),
]);

console.log(`📚 ${String(PLANES.length)} planes a cargar`);

// ── Persistir ─────────────────────────────────────────────────────────────────

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const fila of PLANES) {
      await client.query(
        `INSERT INTO planes_estudio (carrera, version, anio, etiqueta, archivo)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (carrera, version)
         DO UPDATE SET anio = $3, etiqueta = $4, archivo = $5`,
        [fila.carrera, fila.version, fila.anio, fila.etiqueta, fila.archivo],
      );
      console.log(`   ✓ ${fila.etiqueta}`);
    }

    await client.query('COMMIT');
    console.log(`✅ ${String(PLANES.length)} filas cargadas correctamente`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
} finally {
  await pool.end();
}
