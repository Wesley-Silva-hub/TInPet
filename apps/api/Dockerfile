# Build context: raiz do monorepo (docker build -f apps/api/Dockerfile .)
FROM node:22.23-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/prisma.config.ts apps/api/
COPY apps/api/prisma apps/api/prisma
RUN pnpm install --frozen-lockfile --filter @tinpet/api...
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @tinpet/api build \
  && pnpm --filter @tinpet/api deploy --prod --legacy /out

FROM node:22.23-alpine AS runtime
ENV NODE_ENV=production PORT=3333
WORKDIR /app
COPY --from=build --chown=node:node /out ./
USER node
EXPOSE 3333
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/v1/health" || exit 1
# Migrations pendentes são aplicadas a cada deploy (nunca migrate dev em produção)
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/server.mjs"]
