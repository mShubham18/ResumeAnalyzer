##########
# Multi-stage Dockerfile to bundle Vite React frontend and Node/Express backend
##########

# 1) Frontend build (Vite)
FROM node:20-slim AS frontend-build
WORKDIR /app

# Install frontend deps and build
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 2) Backend deps install (production-only)
FROM node:20-slim AS backend-deps
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev

# 3) Runtime image
FROM node:20-slim
WORKDIR /app

# Copy backend node_modules and source
COPY --from=backend-deps /app/server/node_modules /app/server/node_modules
COPY server /app/server

# Copy built frontend
COPY --from=frontend-build /app/dist /app/dist

ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "server/index.js"]


