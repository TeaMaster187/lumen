# Lumen — Liquid Glass Messenger
# Multi-stage Dockerfile for Render deployment (PostgreSQL via Neon)
# Runs Next.js (port 3000) + chat-service (port 3003) in one container

# ---- Build stage ----
FROM node:22-slim AS builder
WORKDIR /app

# Install OpenSSL (Prisma needs it for query engine)
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy lockfile + package.json first for better caching
COPY package.json package-lock.json* ./
COPY prisma ./prisma

# Install all deps + generate Prisma client
RUN npm ci || npm install
RUN npx prisma generate

# Copy the rest of the source
COPY . .

# Build Next.js
RUN npm run build

# ---- Runtime stage ----
FROM node:22-slim AS runner
WORKDIR /app

RUN apt-get update && apt-get install -y openssl curl && rm -rf /var/lib/apt/lists/*

# Copy built app + node_modules
COPY --from=builder /app ./

# Make sure the .bin directory is on PATH (so `next` resolves)
ENV PATH="/app/node_modules/.bin:$PATH"

# Expose ports: 3000 = Next.js, 3003 = socket.io chat-service
EXPOSE 3000 3003

# Environment
ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

# Health check on Next.js
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start script: runs the chat-service in the background, then starts Next.js
# `next` resolves because we added node_modules/.bin to PATH above
CMD ["sh", "-c", "cd mini-services/chat-service && node --experimental-strip-types index.ts &  next start -p 3000"]
