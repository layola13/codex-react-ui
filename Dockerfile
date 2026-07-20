FROM oven/bun:1.3.14-debian AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock tsconfig.base.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/codex-protocol/package.json packages/codex-protocol/package.json
RUN bun install --frozen-lockfile

FROM deps AS build
COPY . .
RUN bun --filter @codex-ui/shared build \
    && bun --filter @codex-ui/server build \
    && bun apps/web/scripts/build.ts

FROM oven/bun:1.3.14-debian AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    CODEX_UI_HOST=0.0.0.0 \
    CODEX_UI_PORT=43110
COPY --from=build /app/package.json /app/bun.lock /app/tsconfig.base.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/server ./apps/server
COPY --from=build /app/apps/web/dist ./apps/web/dist
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/scripts ./scripts
EXPOSE 43110
CMD ["bun", "run", "launch", "--", "--skip-build"]
