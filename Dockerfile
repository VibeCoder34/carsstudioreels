# ─── Stage 1: Bağımlılıklar ───────────────────────────────────
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ─── Stage 2: Build ───────────────────────────────────────────
FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ─── Stage 3: Runner ──────────────────────────────────────────
FROM node:22-slim AS runner

# Remotion renderer için Chromium ve gerekli sistem kütüphaneleri
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    ffmpeg \
    fonts-liberation \
    fonts-noto-color-emoji \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# --no-sandbox wrapper: Cloud Run container'da Chromium sandbox çalışmaz
RUN printf '#!/bin/sh\nexec /usr/bin/chromium --no-sandbox --disable-setuid-sandbox --disable-gpu --disable-dev-shm-usage --no-zygote --disable-breakpad "$@"\n' \
      > /usr/local/bin/chromium-no-sandbox \
 && chmod +x /usr/local/bin/chromium-no-sandbox

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Remotion'un kullanacağı Chromium yolu (no-sandbox wrapper)
ENV CHROMIUM_PATH=/usr/local/bin/chromium-no-sandbox
# Puppeteer'ın kendi Chromium indirmesini engelle
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Standalone build çıktısını kopyala
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Remotion runtime bundling için source dosyaları
COPY --from=builder --chown=nextjs:nodejs /app/src ./src
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./tsconfig.json

# Remotion bundle'ını build sırasında hazırla (cold-start süresi ~2-3 dk kazanılır)
COPY prebundle.cjs ./
RUN node prebundle.cjs

USER nextjs

EXPOSE 3080
ENV PORT=3080
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
