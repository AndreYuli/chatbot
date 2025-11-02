FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

RUN npm install -g pnpm@8

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variables de entorno necesarias para el build
ARG DATABASE_URL
ARG NEXTAUTH_SECRET
ARG NEXTAUTH_URL
ARG GOOGLE_CLIENT_ID
ARG GOOGLE_CLIENT_SECRET
ARG NEXT_PUBLIC_APP_NAME

ENV DATABASE_URL=${DATABASE_URL}
ENV NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
ENV NEXTAUTH_URL=${NEXTAUTH_URL}
ENV GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
ENV GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
ENV NEXT_PUBLIC_APP_NAME=${NEXT_PUBLIC_APP_NAME}
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm install -g pnpm@8 && \
    pnpm prisma generate && \
    pnpm build

FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copiar archivos públicos si existen
COPY --from=builder /app/public* ./public* || true

RUN mkdir .next && chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copiar node_modules necesarios para Prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma* ./node_modules/.prisma* || true
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma* ./node_modules/@prisma* || true

# Copiar archivos de next-intl
COPY --from=builder --chown=nextjs:nodejs /app/messages ./messages

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]