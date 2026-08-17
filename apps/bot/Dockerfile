# Se construye desde la raíz del monorepo:
#   docker build -f apps/bot/Dockerfile .
FROM node:24-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

# --- dependencias + build ---
FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json tsconfig.json ./
COPY packages ./packages
COPY apps ./apps
ENV HUSKY=0
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile
RUN pnpm build
RUN pnpm deploy --filter=@fi/bot --prod --legacy /deploy

# --- runtime ---
# El scrapper lee HTML server-side con fetch + cheerio, así que no hace falta
# ningún navegador en la imagen.
FROM base AS runtime
ENV NODE_ENV=production
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates tzdata \
    && rm -rf /var/lib/apt/lists/*
ENV TZ=America/Argentina/Buenos_Aires

COPY --from=build --chown=node:node /deploy /app
USER node
CMD ["node", "dist/main.js"]
