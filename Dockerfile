# Stage 1: Base (Common dependencies)
FROM node:20-alpine as base
WORKDIR /app
COPY package.json .

# Stage 2: Development (Hot Reload)
FROM base as development
RUN npm install
COPY . .
EXPOSE 3000 5173
CMD ["npm", "run", "dev"]

# Stage 3: Builder (Build React)
FROM base as builder
RUN npm install
COPY . .
RUN npm run build

# Stage 4: Production Server
FROM node:20-alpine as production
WORKDIR /app
COPY package.json .

# Install ONLY production dependencies (skipping postinstall/build scripts)
RUN npm install --production --ignore-scripts

# Copy backend structure
COPY server ./server
# Copy database init script and migrations
COPY init.sql .
COPY migration_add_missing_columns.sql .

# Copy frontend build from builder stage
COPY --from=builder /app/dist ./dist

EXPOSE 3000
# Run migrations before starting server
CMD ["node", "server/index.js"]
