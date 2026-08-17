import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'whatsapp',
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
  },
});
