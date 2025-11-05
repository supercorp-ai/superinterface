# syntax=docker/dockerfile:1

FROM node:22-alpine AS builder
WORKDIR /repo

COPY package.json package-lock.json turbo.json tsconfig.json ./
COPY packages ./packages
RUN npm ci

RUN npm run build --filter=@superinterface/server
RUN npm prune --omit=dev --workspace=@superinterface/server

FROM node:22-alpine AS runner
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app

COPY --from=builder /repo/packages/server/.next ./.next
COPY --from=builder /repo/packages/server/public ./public
COPY --from=builder /repo/packages/server/prisma ./prisma
COPY --from=builder /repo/packages/server/bin ./bin
COPY --from=builder /repo/packages/server/scripts ./scripts
COPY --from=builder /repo/packages/server/types ./types
COPY --from=builder /repo/packages/server/dist ./dist
COPY --from=builder /repo/packages/server/node_modules ./node_modules
COPY --from=builder /repo/packages/server/package.json ./package.json

COPY packages/server/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
