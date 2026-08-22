# Cómo trabajar en este repo

## Reglas del juego

1. **Solo pnpm.** `npm install` y `yarn` están bloqueados por `engine-strict`.
2. **Nada de `process.env` fuera de `@fi/core`.** Toda variable nueva se declara y
   valida en [packages/core/src/env.ts](packages/core/src/env.ts) y se documenta en
   `.env.example`. El linter lo hace cumplir.
3. **Las versiones viven en el catálogo.** Se agrega la dependencia en
   `pnpm-workspace.yaml` bajo `catalog:` y los packages la referencian con
   `"catalog:"`. Así no hay dos versiones de la misma librería en el monorepo.
4. **Dependencias entre packages con `workspace:*`.** Nunca un import relativo que
   cruce el borde de un package.
5. **Sin dependencias circulares.** `import-x/no-cycle` falla el build.
6. **Todo `export` nombrado.** `import-x/no-default-export` está en `error`.
7. **La lógica pura se testea.** Si algo se puede escribir como función pura
   (armado de prompt, parseo de mensajes, normalización de texto), va aparte y con
   test. Lo que pega contra red o base se aísla detrás de una interfaz.

## Flujo

```bash
git checkout -b feat/mi-cambio
pnpm check          # format:check + build + lint + test, a mano
git commit
git push
```

No hay hooks de git ni CI que corran esto automáticamente: queda a criterio de
cada uno correr `pnpm check` antes de pushear o abrir el PR.

## Commits

Conventional Commits con scope del submódulo (sugerido, no forzado por tooling):

```
feat(whatsapp): reconectar la sesión al perder el socket
fix(ai): recortar documentos largos antes de armar el prompt
chore(deps): subir puppeteer a 25.7
```

Scopes sugeridos: `bot`, `whatsapp`, `ai`, `scrapper`, `db`, `queue`, `core`,
`deps`, `repo`, `docs`.

## Tocar el scrapper

El parseo de MRBS se testea contra
[un HTML real guardado como fixture](packages/scrapper/src/__fixtures__/), sin red.
Si el sistema de salas cambia el markup:

1. Bajá el HTML nuevo y reemplazá el fixture.
2. Corré `pnpm --filter @fi/scrapper test` y ajustá el parseo hasta que pase.

La verificación de alineación de columnas **no se toca**: es lo único que impide
que el bot mande a un alumno al aula equivocada si el HTML cambia de forma. Si
falla, se arregla el parseo, no se afloja el chequeo.

## Migraciones

El esquema se edita en [packages/db/src/schema/](packages/db/src/schema/), después:

```bash
pnpm db:generate   # genera el SQL en packages/db/drizzle
pnpm db:migrate    # lo aplica
```

Las migraciones generadas se commitean.
