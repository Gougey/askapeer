# Build context: repo root (npm workspaces monorepo).
# Deployed to Fly as askapeer-api. See apps/api/fly.toml.
FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci
COPY apps/api apps/api
RUN npm run build -w apps/api

FROM node:24-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci --omit=dev
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/apps/api/drizzle apps/api/drizzle
WORKDIR /app/apps/api
ENV API_PORT=4000
EXPOSE 4000
# Migrations run via fly.toml release_command (node dist/db/migrate.js).
CMD ["node", "dist/main.js"]
