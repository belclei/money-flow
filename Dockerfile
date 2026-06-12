FROM node:22-slim AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma.config.ts ./
COPY prisma/schema.prisma ./prisma/schema.prisma

RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# ─────────────────────────────────────────
FROM node:22-slim AS runner

WORKDIR /app

# Python 3 + curl (para uv)
RUN apt-get update && apt-get install -y python3 curl ca-certificates --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# uv
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.local/bin:$PATH"

# Arquivos do build
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY scripts ./scripts

# MarkItDown no venv
RUN uv venv .venv && \
    uv pip install "markitdown[pdf]" --python .venv/bin/python

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
EXPOSE 3000

CMD ["npm", "start"]
