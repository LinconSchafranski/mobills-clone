# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# base: imagem comum a todos os estágios
# ---------------------------------------------------------------------------
FROM node:22-alpine AS base
# libc6-compat é recomendado pelo próprio time do Next.js em imagens Alpine
RUN apk add --no-cache libc6-compat
WORKDIR /app


# ---------------------------------------------------------------------------
# deps: instala TODAS as dependências (incl. devDependencies) para o build.
# better-sqlite3 tem binding nativo — se não houver binário pré-compilado
# para linux/musl, ele compila do zero, por isso python3/make/g++ aqui.
# ---------------------------------------------------------------------------
FROM base AS deps
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci


# ---------------------------------------------------------------------------
# builder: gera o Prisma Client e compila o Next.js em modo standalone
# ---------------------------------------------------------------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate
RUN npm run build


# ---------------------------------------------------------------------------
# migrate-deps: instalação isolada, só com a CLI do Prisma, usada apenas
# para rodar `prisma migrate deploy` na inicialização do container. Fica
# separada do node_modules da aplicação para não inflar a imagem final.
# ---------------------------------------------------------------------------
FROM base AS migrate-deps
WORKDIR /app/migrate
# mantenha esta versão sincronizada com o devDependency "prisma" do package.json
RUN npm install prisma@7.10.0 --no-save


# ---------------------------------------------------------------------------
# runner: imagem final, mínima, sem devDependencies nem código-fonte extra
# ---------------------------------------------------------------------------
FROM base AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# Caminho do banco SQLite dentro do volume persistente (ver seção VOLUME abaixo)
ENV DATABASE_URL=file:/app/data/dev.db

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# --- servidor Next.js (build standalone) -----------------------------------
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# --- reforço para o binário nativo do better-sqlite3 ------------------------
# O tracer do Next.js (@vercel/nft) nem sempre detecta corretamente módulos
# nativos carregados dinamicamente (é o caso do better-sqlite3, via o pacote
# "bindings"). Copiamos esses pacotes explicitamente do builder para garantir
# que o binário .node compilado esteja presente na imagem final.
COPY --from=builder /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=builder /app/node_modules/bindings ./node_modules/bindings
COPY --from=builder /app/node_modules/file-uri-to-path ./node_modules/file-uri-to-path
COPY --from=builder /app/node_modules/@prisma/adapter-better-sqlite3 ./node_modules/@prisma/adapter-better-sqlite3
COPY --from=builder /app/node_modules/@prisma/driver-adapter-utils ./node_modules/@prisma/driver-adapter-utils

# --- CLI do Prisma isolada + schema/migrations, só para `migrate deploy` ---
COPY --from=migrate-deps --chown=nextjs:nodejs /app/migrate/node_modules ./migrate/node_modules
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./migrate/prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma7.config.ts ./migrate/prisma7.config.ts

COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# --- volume onde o banco SQLite persiste entre rebuilds do container -------
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data
VOLUME ["/app/data"]

USER nextjs

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
