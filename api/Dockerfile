# Stage 1: Build the application
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
# Install all dependencies needed for building
RUN npm install
COPY . .
# Run the build script defined in package.json
RUN npm run build

# Stage 2: Production environment
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm ci --only=production
# Copy the built application from the builder stage
COPY --from=builder /app/dist ./dist

# Use a non-root user for security
USER node
EXPOSE 3000
# Command to run the application
CMD ["node", "dist/server.js"]