# EraseAI in one container: the API server also serves the website
# (WEB_DIST_DIR). Runs on Google Cloud Run, AWS App Runner / ECS, or any
# Docker host. Needs at runtime: DATABASE_URL and the secrets listed in
# docs/DEPLOY_CLOUD.md. Listens on $PORT (default 8080).

FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate
COPY . .
# Only the website, the API server and the libraries they use.
RUN pnpm install --frozen-lockfile \
      --filter "@workspace/api-server..." \
      --filter "@workspace/eraseai..."
# Website (static files) and API server bundle (it also packs the Chrome
# extension from ./extension for /api/extension/download).
RUN PORT=8080 BASE_PATH=/ pnpm --filter @workspace/eraseai run build \
 && pnpm --filter @workspace/api-server run build

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8080 \
    WEB_DIST_DIR=/app/artifacts/eraseai/dist/public
# Keep the workspace node_modules: a few server packages (stripe-replit-sync,
# bcrypt) are loaded from disk rather than bundled.
COPY --from=build /app /app
EXPOSE 8080
CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
