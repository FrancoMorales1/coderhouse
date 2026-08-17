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

## Roadmap

Funcionalidades planificadas para versiones futuras:

- **Novedades** — noticias de la facultad, suspensión de clases por alertas
  meteorológicas o paros, comunicados de bedelía. Requiere una fuente de datos
  oficial (RSS, scraping del sitio web o canal de comunicación interno).

- **Mesas de exámenes** — fecha, aula y horario de cada final. El sistema SIU
  Guaraní expone esta información pero requiere credenciales de alumno para
  acceder. Necesita que cada usuario vincule su cuenta o que la facultad provea
  un acceso institucional.

- **Profesores por materia** — qué docente dicta cada cursada. MRBS registra el
  nombre del responsable de la reserva; con un solo usuario institucional y
  scraping se puede obtener sin que el alumno se matricule.

- **Rating de materias y profesores** — recolección de opiniones de alumnos vía
  WhatsApp, almacenamiento anónimo y consulta de promedios por materia o docente.

## Base de conocimiento

### Fuentes activas

| Fuente                       | Contenido                                                                             | Actualización                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| MRBS (`salas.fi.mdp.edu.ar`) | Horarios de cursadas: aula, horario, materia, tipo                                    | Cron diario a las 4 am                                          |
| `material/`                  | Calendario académico, planes de estudio, enlaces, infraestructura, grupos de WhatsApp | Script [`scripts/seed-material.mjs`](scripts/seed-material.mjs) |

### Material pendiente para la BBDD

El archivo [`scripts/seed-material.mjs`](scripts/seed-material.mjs) carga lo que
ya está en `material/`. Lo que falta agregar a esa carpeta antes del próximo seed:

#### Grupos de WhatsApp

- Grupos por carrera: IINF, ICOM, IELEM, IQ, IMEC, IMAT, IA, IELO, Industrial,
  Electromecánica (actualmente solo existe el grupo general del CEI).
- Grupos por año o nivel (1.º, 2.º, …).
- Grupos por materia de primer año (Análisis I, Álgebra, Física, etc.).
- Grupo de novedades de bedelía o secretaría, si existe.
- Discord oficial de la facultad (pendiente de conseguir el enlace).

#### Enlaces

- Discord oficial de la facultad (marcado como TODO en los datos actuales).
- Instagram y Facebook oficiales de la facultad y de cada departamento.
- Canal de noticias o comunicados (RSS u otro).
- Formularios web: cambio de carrera, renuncia de habilitación, solicitudes varias.
- Catálogo y acceso en línea de la biblioteca universitaria.

#### Infraestructura

- Horarios de atención de bedelía (días y franjas horarias).
- Horarios de secretaría académica.
- Biblioteca: ubicación exacta, horarios, cómo acceder al catálogo.
- Laboratorio de Idiomas: cómo inscribirse al nivel IV, fechas de la prueba de
  suficiencia (requisito de egreso para todos los planes).
- Buffet/comedor: horarios y ubicación.
- WiFi para alumnos: cómo conectarse, credenciales o portal captivo.
- Sala de computación: horarios de acceso libre.

#### Información institucional

- Reglamento de regularidad: inasistencias permitidas y condiciones para
  perder la regularidad.
- Reglamento de promoción sin examen final: requisitos de nota y asistencia.
- Proceso paso a paso de inscripción en SIU Guaraní.
- Renuncia de habilitación: plazo, formulario y consecuencias.
- Proceso de cambio de carrera o de plan de estudios (ventana: 02/02–20/02 según
  el calendario vigente).
- Becas disponibles: universitarias, nacionales (PNBU) y de la facultad.
- Contactos de departamentos: email, teléfono y horario de atención.
- Requisitos de egreso: nivel IV de inglés, Práctica Profesional Supervisada
  (200 hs) y Práctica Sociocomunitaria.

## Pendientes técnicos

- El bot no distingue comisiones cuando el alumno no las nombra: si una materia
  tiene A1 y A2, las lista todas.
- El menú de opciones y la tabla `material` están diseñados pero aún no
  implementados; el bot responde en modo libre sin estructura de opciones.
- El deploy en el servidor definitivo de la Facultad está pendiente; la imagen
  Docker se publica en GHCR pero no hay pipeline de deploy automático.
