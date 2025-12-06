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
RUN npm install --production
# Copy backend structure
COPY server ./server
# Copy frontend build
COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "server/index.js"]
