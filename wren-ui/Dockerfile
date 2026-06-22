FROM node:18-bookworm-slim AS base
RUN apt-get update && apt-get install -y curl python3 make g++ && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare yarn@4.5.3 --activate
ENV NEXT_TELEMETRY_DISABLED=1 NODE_ENV=production
WORKDIR /app
COPY .yarnrc.yml package.json yarn.lock ./
COPY .yarn/releases/yarn-4.5.3.cjs .yarn/releases/yarn-4.5.3.cjs

FROM base AS deps
RUN --mount=type=cache,target=/root/.yarn/cache \
    yarn install --immutable

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY tsconfig.json next.config.js .eslintrc.json .eslintignore .prettierrc ./
COPY public ./public
COPY src ./src
RUN yarn build

FROM base AS runner
WORKDIR /app
RUN mkdir .next
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules ./node_modules
COPY migrations ./migrations
COPY knexfile.js ./knexfile.js

EXPOSE 3000
ENV PORT=3000
CMD yarn knex migrate:latest && HOSTNAME="0.0.0.0" node server.js