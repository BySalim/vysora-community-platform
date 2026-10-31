# syntax=docker/dockerfile:1.7
# Images de production de Vysora (OPS-01, ADR-0008) : une construction commune, puis deux cibles.
#   docker build --target api -t vysora-api .
#   docker build --target web --build-arg SITE_URL=https://vysora.example -t vysora-web .
# La composition de production (infra/production/compose.yml) les construit et les relie.

FROM node:24-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /depot

# Manifestes seuls : les dépendances ne se réinstallent que si l'un d'eux change.
FROM base AS manifestes
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/

FROM manifestes AS construction
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
COPY apps/web apps/web
# Adresse publique du site : Astro la grave dans le build (liens absolus, canonique).
ARG SITE_URL=http://localhost:4321
ENV SITE_URL=$SITE_URL
RUN pnpm --filter @vysora/shared build \
  && pnpm --filter @vysora/api build \
  && pnpm --filter @vysora/web build

FROM manifestes AS dependances
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --prod

# Socle d'exécution : dépendances de production et paquet partagé construit.
FROM base AS execution
ENV NODE_ENV=production
COPY --from=dependances /depot/node_modules node_modules
COPY --from=dependances /depot/packages/shared/node_modules packages/shared/node_modules
COPY --from=construction /depot/packages/shared/package.json packages/shared/package.json
COPY --from=construction /depot/packages/shared/dist packages/shared/dist

# API : serveur, migrations (drizzle/), commandes start:migrate, start:seed, start:demo.
FROM execution AS api
COPY --from=dependances /depot/apps/api/node_modules apps/api/node_modules
COPY --from=construction /depot/apps/api/package.json apps/api/package.json
COPY --from=construction /depot/apps/api/dist apps/api/dist
COPY apps/api/drizzle apps/api/drizzle
# Images du prototype : les données de démonstration de la préproduction en ont besoin (DEMO-02).
COPY prototype/assets prototype/assets
WORKDIR /depot/apps/api
RUN mkdir -p /donnees/stockage && chown node:node /donnees/stockage
USER node
ENV API_PORT=3000
EXPOSE 3000
CMD ["node", "dist/main.js"]

# Site : serveur Astro autonome (rendu des pages, relais /api, CSP).
FROM execution AS web
COPY --from=dependances /depot/apps/web/node_modules apps/web/node_modules
COPY --from=construction /depot/apps/web/package.json apps/web/package.json
COPY --from=construction /depot/apps/web/dist apps/web/dist
WORKDIR /depot/apps/web
USER node
ENV HOST=0.0.0.0
ENV PORT=4321
EXPOSE 4321
CMD ["node", "dist/server/entry.mjs"]
