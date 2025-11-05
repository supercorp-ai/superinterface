# syntax=docker/dockerfile:1

ARG VERSION=latest
FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

RUN apk add --no-cache openssl
RUN npm init -y

ARG VERSION
RUN npm install --omit=dev @superinterface/server@${VERSION} next@15.5.4

WORKDIR /app/node_modules/@superinterface/server
RUN npx prisma generate --schema prisma/schema.prisma

EXPOSE 3000
ENTRYPOINT ["node", "bin/index.cjs", "run", "server"]
