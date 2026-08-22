import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const wrapper = join(dirname(fileURLToPath(import.meta.url)), '../scripts/drizzle-kit.mjs');

describe('wrapper de drizzle-kit', () => {
  it('encuentra el CLI sin depender del PATH', () => {
    const resultado = spawnSync(process.execPath, [wrapper, '--help'], {
      encoding: 'utf8',
    });

    expect(resultado.error).toBeUndefined();
    expect(resultado.status).toBe(0);
    expect(`${resultado.stdout}${resultado.stderr}`).toMatch(/drizzle-kit/i);
  });
});
