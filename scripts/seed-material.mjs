#!/usr/bin/env node
/**
 * Pobla la tabla `material` con el contenido de /material/.
 *
 * Prerrequisitos:
 *   1. La tabla `material` debe existir (correr pnpm db:migrate primero).
 *   2. pdf-parse debe estar instalado: pnpm add -D pdf-parse
 *
 * Uso:
 *   node scripts/seed-material.mjs
 *
 * El script es idempotente: borra todo lo que haya insertado antes (filas con
 * fuente != null) y vuelve a cargar desde los archivos. No toca filas creadas
 * manualmente (fuente IS NULL).
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
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

// ── pdf-parse ─────────────────────────────────────────────────────────────────

let parsePdf;
try {
  const mod = await import('pdf-parse');
  parsePdf = mod.default;
} catch {
  console.error('❌ pdf-parse no está instalado. Corré: pnpm add -D pdf-parse');
  process.exit(1);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const materialDir = resolve(__dirname, '../material');

/** Lee un PDF y devuelve su texto plano. */
async function leerPdf(ruta) {
  const data = await parsePdf(readFileSync(ruta));
  return data.text.trim();
}

/**
 * Normaliza el nombre de una carrera a partir del nombre del archivo PDF.
 * "Copia de DIR-ESTUD-Plan de Transición IINF-ANEXO I.pdf" → "IINF"
 * "PLAN 2010 - INGENIERÍA EN INFORMATICA.pdf" → "INGENIERÍA EN INFORMATICA (Plan 2010)"
 */
function nombreCarrera(archivo) {
  const sinExt = archivo.replace(/\.pdf$/i, '').trim();

  // Planes de transición: extraer el código de carrera
  const transicion = sinExt.match(/Plan de Transici[oó]n[- ]+([A-Z]+)/i);
  if (transicion) return transicion[1];

  // Planes 2003/2010/2024: "PLAN YYYY - NOMBRE"
  const planAnio = sinExt.match(/PLAN (\d+)\s*[-–]\s*(.+)/i);
  if (planAnio) return `${planAnio[2].trim()} (Plan ${planAnio[1]})`;

  // Planes con año en el nombre: "Plan de NOMBRE-YYYY-..."
  const planNombre = sinExt.match(/Plan de\s+(.+?)\s*[-–]/i);
  if (planNombre) return planNombre[1].trim();

  return sinExt;
}

// ── Recolectar filas ──────────────────────────────────────────────────────────

const filas = [];

// --- enlaces.txt ---
// Formato de cada línea: "Etiqueta: URL" (ignora TODO y líneas sin URL)
console.log('📄 Leyendo enlaces.txt...');
const enlacesRaw = readFileSync(join(materialDir, 'enlaces.txt'), 'utf8');
for (const linea of enlacesRaw.split('\n')) {
  const t = linea.trim();
  if (!t || t.startsWith('#') || t.toLowerCase().startsWith('todo')) continue;
  const match = t.match(/^(.+?):\s*(https?:\/\/.+)$/);
  if (!match) continue;
  filas.push({
    categoria: 'enlace',
    subcategoria: null,
    titulo: match[1].trim(),
    contenido: match[2].trim(),
    fuente: 'enlaces.txt',
  });
}
console.log(`   → ${filas.filter((f) => f.fuente === 'enlaces.txt').length} enlaces`);

// --- gruposwpp.txt ---
console.log('📄 Leyendo gruposwpp.txt...');
const gruposRaw = readFileSync(join(materialDir, 'gruposwpp.txt'), 'utf8');
for (const linea of gruposRaw.split('\n')) {
  const t = linea.trim();
  if (!t) continue;
  const match = t.match(/^(.+?):\s*(https?:\/\/.+)$/);
  if (!match) continue;
  filas.push({
    categoria: 'grupo_wpp',
    subcategoria: null,
    titulo: match[1].trim(),
    contenido: match[2].trim(),
    fuente: 'gruposwpp.txt',
  });
}
console.log(`   → ${filas.filter((f) => f.fuente === 'gruposwpp.txt').length} grupos`);

// --- infraestructura-facultad.txt ---
console.log('📄 Leyendo infraestructura-facultad.txt...');
const infraRaw = readFileSync(join(materialDir, 'infraestructura-facultad.txt'), 'utf8');
filas.push({
  categoria: 'infraestructura',
  subcategoria: null,
  titulo: 'Infraestructura de la Facultad de Ingeniería - UNMdP',
  contenido: infraRaw.trim(),
  fuente: 'infraestructura-facultad.txt',
});
console.log('   → 1 sección');

// --- Calendario académico PDF ---
console.log('📄 Leyendo calendario académico...');
const calPath = join(materialDir, 'OCA 638-25 CALENDARIO ACADEMICO 2026.pdf');
filas.push({
  categoria: 'calendario',
  subcategoria: '2026',
  titulo: 'Calendario Académico 2026 - Facultad de Ingeniería UNMdP',
  contenido: await leerPdf(calPath),
  fuente: 'OCA 638-25 CALENDARIO ACADEMICO 2026.pdf',
});
console.log('   → 1 documento');

// --- Planes de estudio PDFs ---
console.log('📄 Leyendo planes de estudio...');
const planDir = join(materialDir, 'Plan de estudios');
const planFiles = readdirSync(planDir)
  .filter((f) => f.endsWith('.pdf'))
  .sort();

let planesLeidos = 0;
for (const archivo of planFiles) {
  const carrera = nombreCarrera(archivo);
  filas.push({
    categoria: 'plan_estudios',
    subcategoria: carrera,
    titulo: `Plan de estudios: ${carrera}`,
    contenido: await leerPdf(join(planDir, archivo)),
    fuente: archivo,
  });
  console.log(`   ✓ ${carrera}`);
  planesLeidos++;
}
console.log(`   → ${planesLeidos} planes`);

// ── Persistir ─────────────────────────────────────────────────────────────────

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Borrar solo filas cargadas por el script (las manuales tienen fuente NULL)
    const { rowCount: borradas } = await client.query(
      'DELETE FROM material WHERE fuente IS NOT NULL',
    );
    console.log(`\n🗑  ${borradas ?? 0} filas anteriores eliminadas`);

    for (const fila of filas) {
      await client.query(
        `INSERT INTO material (categoria, subcategoria, titulo, contenido, fuente)
         VALUES ($1, $2, $3, $4, $5)`,
        [fila.categoria, fila.subcategoria, fila.titulo, fila.contenido, fila.fuente],
      );
    }

    await client.query('COMMIT');
    console.log(`✅ ${filas.length} filas insertadas correctamente`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
} finally {
  await pool.end();
}
