FROM node:18-alpine AS builder

WORKDIR /app

RUN npm i -g pnpm@8

COPY package.json pnpm-lock.yaml ./

RUN pnpm i --frozen-lockfile

COPY . .

RUN NEXT_TELEMETRY_DISABLED=1 pnpm build

FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/.next/standalone ./

COPY --from=builder /app/.next/static ./.next/static

COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node","server.js"]