# Multi-stage build for Railway/container deployment.
# Railway can also build this repo directly via Nixpacks with no Dockerfile at all -
# this file is here for teams that want an explicit, portable container build instead.

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
# scripts/ isn't part of the Next standalone trace (nothing in the app
# imports it), so it has to be copied explicitly - this is what the
# taktco-cron Railway service runs via `node scripts/cron.js`.
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
EXPOSE 3000
CMD ["node", "server.js"]
