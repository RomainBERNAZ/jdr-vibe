# Stage 1: Build React
FROM node:18-alpine as builder
WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Production Server
FROM node:18-alpine
WORKDIR /app
COPY package.json .
RUN npm install --production
# Copy backend structure
COPY server ./server
# Copy frontend build
COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "server/index.js"]

