# Bot de WhatsApp - Facultad de Ingeniería, UNMdP

Asistente de WhatsApp que responde **horarios de cursadas** de la Facultad de
Ingeniería de la Universidad Nacional de Mar del Plata: qué día, a qué hora y en
qué aula se dicta cada materia.

Los horarios salen del sistema de reserva de salas de la Facultad
([salas.fi.mdp.edu.ar](https://salas.fi.mdp.edu.ar/)), que corre MRBS. Un job
diario a las 4am trae los próximos 7 días y los deja en Postgres; cuando un alumno
pregunta, el bot arma el contexto con esos horarios más el historial del chat y se
lo pasa a Gemini.

```
WhatsApp ──▶ @fi/bot ──▶ contexto (horarios en Postgres + historial)
                │
                └──▶ @fi/ai ──▶ Gemini ──▶ respuesta ──▶ WhatsApp

@fi/queue (cron 4am) ──▶ @fi/scrapper ──▶ MRBS ──▶ Postgres
```

> **Alcance actual.** El bot responde solo sobre horarios de cursadas. Ante
> cualquier otro tema (inscripciones, trámites, finales) avisa que no sabe y
> deriva a la web oficial. Es deliberado: una sola fuente de datos, verificable.

## Estructura

| Package        | Rol                                                       |
| -------------- | --------------------------------------------------------- |
| `apps/bot`     | Orquestador: cablea los submódulos y programa el scraping |
| `@fi/whatsapp` | Conexión Baileys, recepción y envío de mensajes           |
| `@fi/ai`       | Armado del prompt y consulta a Gemini                     |
| `@fi/scrapper` | Lectura de la grilla de MRBS y persistencia de horarios   |
| `@fi/db`       | Esquema Drizzle y acceso a Postgres                       |
| `@fi/queue`    | Colas BullMQ sobre Redis (el cron diario)                 |
| `@fi/core`     | Config validada, logger y errores compartidos             |

Los tres submódulos del enunciado son **WhatsApp**, **IA** y **Scrapper**; `db`,
`queue` y `core` existen para que esos tres no se pisen entre sí.

## Stack

Node 24 · TypeScript · pnpm workspaces · Postgres + Drizzle · Redis + BullMQ ·
Baileys · cheerio · Gemini · Vitest · ESLint + Prettier · GitHub Actions

## Arranque

```bash
pnpm install
cp .env.example .env          # completar GEMINI_API_KEY
pnpm services:up              # Postgres + Redis en Docker
pnpm db:generate && pnpm db:migrate
SCRAPPER_AL_INICIAR=true pnpm dev   # scrapea al toque y muestra el QR
```

Sin `SCRAPPER_AL_INICIAR` la base arranca vacía y el bot no sabe ningún horario
hasta las 4am.

Requisitos: Node >= 24 (`nvm use`), pnpm >= 10, Docker.

## Comandos

| Comando              | Qué hace                                       |
| -------------------- | ---------------------------------------------- |
| `pnpm dev`           | Bot en watch mode (tsx, sin build previo)      |
| `pnpm build`         | `tsc -b` sobre todo el monorepo                |
| `pnpm test`          | Vitest en todos los packages                   |
| `pnpm test:coverage` | Tests + reporte de cobertura                   |
| `pnpm lint`          | ESLint con type-checking                       |
| `pnpm format`        | Prettier sobre el repo                         |
| `pnpm check`         | format + lint + build + test (lo mismo que CI) |
| `pnpm clean`         | Borra `dist/`, `.tsbuildinfo` y `coverage/`    |

## Cómo lee los horarios

MRBS renderiza el día como una grilla de aulas (columnas) por franjas de 30
minutos (filas). Una clase de 2 horas es un único `<td rowspan="4">`, así que en
las filas siguientes esa columna **no aparece en el HTML** y las demás celdas
quedan corridas: la posición del `<td>` no es la columna real.

[parseo.ts](packages/scrapper/src/parseo.ts) reconstruye la grilla llevando
cuenta de cuántas filas sigue ocupada cada columna, igual que hace el navegador al
maquetar. Como equivocarse de columna significa mandar a un alumno al aula
equivocada, el recorrido **se autoverifica**: las celdas libres traen su `room` en
el href, así que se compara contra la columna calculada en cada paso y la corrida
falla si algo no cierra.

Detalles que ya están contemplados y testeados:

- Los **domingos** están deshabilitados en MRBS y el server redirige al día
  siguiente; se registran como días sin clases en lugar de guardar datos de otra
  fecha.
- Los **feriados** y sábados aparecen con la grilla entera libre: 0 clases, sin
  error.
- La **zona horaria** es la de Argentina aunque el server corra en UTC.
- Un día que falla no tumba la corrida, y si _ningún_ día trajo clases el scrapeo
  aborta sin tocar la base, para no borrar los horarios buenos.

Los tests corren contra un
[HTML real del sitio](packages/scrapper/src/__fixtures__/) guardado como fixture,
así que verifican el parseo sin depender de la red.

## CI/CD

- **CI** ([.github/workflows/ci.yml](.github/workflows/ci.yml)): en cada push y PR
  corre `format`, `lint` y `build` en paralelo, más `test` con Postgres y Redis
  reales como service containers. El job `CI OK` es el que conviene marcar como
  required check en la protección de rama.
- **CD** ([.github/workflows/cd.yml](.github/workflows/cd.yml)): espera a CI,
  buildea la imagen de `apps/bot` y la publica en GHCR. El deploy final está como
  placeholder hasta definir el servidor de la Facultad.

## Convenciones

Están en [CONTRIBUTING.md](CONTRIBUTING.md): commits, catálogo de versiones, hooks
y la regla de que `process.env` solo se toca desde `@fi/core`.

## Pendientes conocidos

- La migración nunca se aplicó contra un Postgres real (falta levantar el compose).
- El bot no distingue comisiones cuando el alumno no las nombra: si una materia
  tiene A1 y A2, las lista todas.
- No hay rate limiting por JID; conviene agregarlo antes de exponerlo a alumnos.
- Ampliar el alcance más allá de horarios requiere otra fuente de datos y ajustar
  la instrucción de sistema en [prompt.ts](packages/ai/src/prompt.ts).
