# Stage 1: Base (Common dependencies)
FROM node:24-alpine as base
WORKDIR /app
COPY package.json package-lock.json ./

# Stage 2: Development (Hot Reload)
FROM base as development
RUN npm ci
COPY . .
EXPOSE 3000 5173
CMD ["npm", "run", "dev"]

# Stage 3: Builder (Build React)
FROM base as builder
RUN npm ci
COPY . .
RUN npm run build

# Stage 4: Production Server
FROM node:24-alpine as production
WORKDIR /app
COPY package.json package-lock.json ./

RUN npm ci --omit=dev

# Copy backend structure
COPY server ./server
# Copy database migrations
COPY init.sql migration_v1.sql migration_v2.sql migration_v3.sql ./

# Copy frontend build from builder stage
COPY --from=builder /app/dist ./dist

EXPOSE 3000
# Run migrations before starting server
CMD ["node", "server/index.js"]
