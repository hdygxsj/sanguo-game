FROM node:20-bookworm-slim

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm --filter @agent-arena/api db:generate && pnpm build

ENV NODE_ENV=production
ENV PORT=8787
ENV DATABASE_URL=file:/data/agent-arena.db
EXPOSE 8787

CMD ["sh", "-c", "pnpm db:setup && pnpm start"]
