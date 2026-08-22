#!/usr/bin/env node
/**
 * Arranca el CLI de drizzle-kit por ruta absoluta.
 *
 * En Windows, `pnpm run` a veces no pone `node_modules/.bin` en el PATH de
 * cmd.exe, y queda "drizzle-kit no se reconoce como un comando interno o
 * externo" aunque el paquete esté instalado. Resolver el binario con Node
 * evita el shim.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(pkgDir, 'package.json'));

let bin;
try {
  bin = join(dirname(require.resolve('drizzle-kit')), 'bin.cjs');
} catch {
  bin = join(pkgDir, 'node_modules', 'drizzle-kit', 'bin.cjs');
}

if (!existsSync(bin)) {
  console.error(`No se encontró drizzle-kit (${bin}). Corré pnpm install en la raíz del repo.`);
  process.exit(1);
}

const child = spawn(process.execPath, [bin, ...process.argv.slice(2)], {
  stdio: 'inherit',
  cwd: pkgDir,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
