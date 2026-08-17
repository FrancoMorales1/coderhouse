## Qué hace

<!-- Una o dos frases. Si hay issue, linkealo: Closes #123 -->

## Cómo se prueba

<!-- Pasos concretos para verificarlo local -->

## Checklist

- [ ] `pnpm check` pasa local (format + lint + build + test)
- [ ] Hay tests para lo nuevo o para el bug que se arregla
- [ ] Si cambió el esquema, se generó la migración (`pnpm db:generate`)
- [ ] Si se agregó una variable de entorno, está en `.env.example` y en `env.ts`
- [ ] Los commits siguen Conventional Commits
