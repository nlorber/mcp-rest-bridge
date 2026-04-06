# ---- Build stage ----
FROM node:22-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ src/
COPY mock-api/ mock-api/
COPY prompts/ prompts/
RUN npm run build

# ---- Runtime stage ----
FROM node:22-alpine

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/build/ build/
COPY prompts/ prompts/

ENV NODE_ENV=production
EXPOSE 3456 3100

CMD ["node", "build/src/index.js"]
