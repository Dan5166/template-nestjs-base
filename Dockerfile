# syntax=docker/dockerfile:1

# --- Stage 1: build -----------------------------------------------------------
# Compiles TypeScript to dist/ using the full dev dependency set.
FROM node:20-alpine AS builder
WORKDIR /app

# Install deps first so this layer is cached until package*.json changes.
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Drop devDependencies so they can be copied into the runtime image.
RUN npm prune --omit=dev

# --- Stage 2: runtime ---------------------------------------------------------
# Minimal image: production deps + compiled output only, run as non-root.
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

# `node` user ships with the base image; avoid running as root.
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/package.json ./package.json

USER node

EXPOSE 3000

# Matches `npm run start:prod` (node dist/main) without the npm wrapper process,
# so SIGTERM reaches Node directly and enableShutdownHooks() can run.
CMD ["node", "dist/main"]
