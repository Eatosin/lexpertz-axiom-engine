# Phase 1: Dependency Installation
# We use Alpine Linux for a lightweight footprint
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# 'npm ci' is faster and more reliable than 'npm install' for builds
RUN npm ci

# Phase 2: The Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Disable Next.js telemetry during build
ENV NEXT_TELEMETRY_DISABLED 1

# Provide dummy keys to satisfy the build time check (Clerk)
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_dummy
ENV CLERK_SECRET_KEY=sk_test_dummy

RUN npm run build

# Phase 3: The Runner (Production)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy only the necessary build artifacts
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

USER nextjs

EXPOSE 3000

CMD ["npm", "start"]
