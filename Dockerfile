# Dockerfile for a Next.js application

# Stage 1: Build the application
FROM node:20-alpine AS builder
# Set working directory
WORKDIR /app

# Copy package manager files and install dependencies
# This leverages Docker's layer caching.
COPY package.json ./
COPY package-lock.json ./
RUN npm install

# Copy the rest of the application source code
COPY . .

# Build the Next.js application for production
RUN npm run build

# Stage 2: Create the production image
FROM node:20-alpine AS runner
WORKDIR /app

# Set environment to production
ENV NODE_ENV=production

# Copy built assets from the builder stage
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Expose the port the app will run on
EXPOSE 3000

# Set the command to start the Next.js server
# By default, `next start` runs on port 3000
CMD ["npm", "start"]
