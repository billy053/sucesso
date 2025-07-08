# Use Node.js 18 LTS
FROM node:18-alpine as builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/

# Install ALL dependencies (including dev dependencies for build)
RUN npm ci
RUN cd server && npm ci

# Copy source code
COPY . .

# Build the frontend
RUN npm run build

# Production stage
FROM node:18-alpine

# Install SQLite
RUN apk add --no-cache sqlite

# Set working directory
WORKDIR /app

# Copy built application and server
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/package.json ./package.json

# Copy package files for production install
COPY --from=builder /app/server/package*.json ./server/

# Install only production dependencies
RUN cd server && npm ci --omit=dev

# Create database directory with proper permissions
RUN mkdir -p /app/data && chmod 755 /app/data

# Create a non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Change ownership of the app directory
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 3001

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV DATABASE_PATH=/app/data/vitana.db
ENV JWT_SECRET=vitana-jwt-secret-key-2024
ENV SUPER_ADMIN_PASSWORD=SuperAdmin2024!

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"
