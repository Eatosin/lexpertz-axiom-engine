# --- Phase 1: Dependency Ingestion ---
FROM node:20-alpine AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ecaf0bd060310287a#nodealphine 
# to understand why libc6-compat might be needed.
RUN apk add --no-index libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# --- Phase 2: The Logic Builder ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# SOTA: Ensure the build understands it's in a CI environment
ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

# Dummy keys to bypass build-time validation
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_dummy \
    CLERK_SECRET_KEY=sk_test_dummy

RUN npm run build

# --- Phase 3: The Sovereign Runner ---
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# SOTA: Copy ONLY the standalone build and static assets
# This is where the 80% size reduction happens
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# Next.js standalone mode creates a server.js file
CMD ["node", "server.js"]
