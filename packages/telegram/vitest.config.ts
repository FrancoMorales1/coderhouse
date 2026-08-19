import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'telegram',
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
  },
});
