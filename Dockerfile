FROM node:18-alpine3.18 AS deps
RUN apk add --no-cache libc6-compat openssl1.1-compat
WORKDIR /app

RUN npm install -g pnpm@8

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

FROM node:18-alpine3.18 AS builder
WORKDIR /app
# Instalar OpenSSL 1.1 para Prisma en build stage
RUN apk add --no-cache openssl1.1-compat
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variables de entorno necesarias para el build - usar valores dummy para evitar errores de URL
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXTAUTH_URL=http://localhost:3000
ENV NEXTAUTH_SECRET=build-time-secret-will-be-replaced
ENV NEXT_PUBLIC_APP_NAME=SAGES
ENV N8N_BASE_URL=http://localhost:5678
ENV N8N_WEBHOOK_PATH=/webhook/chat
ENV N8N_API_KEY=build-time-dummy-key

RUN npm install -g pnpm@8 && \
    pnpm prisma generate && \
    pnpm build

FROM node:18-alpine3.18 AS runner
WORKDIR /app

# Instalar OpenSSL 1.1 para Prisma en runtime
RUN apk add --no-cache openssl1.1-compat

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

RUN mkdir .next && chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copiar archivos de next-intl
COPY --from=builder --chown=nextjs:nodejs /app/messages ./messages

# Copiar schema de Prisma para migraciones
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]