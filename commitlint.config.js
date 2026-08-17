/**
 * Conventional Commits + scopes propios del monorepo.
 * Ej: feat(whatsapp): reconectar sesión al perder el socket
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      ['bot', 'whatsapp', 'ai', 'scrapper', 'db', 'queue', 'core', 'ci', 'deps', 'repo', 'docs'],
    ],
    'subject-case': [2, 'never', ['pascal-case', 'upper-case']],
    'header-max-length': [2, 'always', 100],
    'body-max-line-length': [1, 'always', 120],
  },
};
