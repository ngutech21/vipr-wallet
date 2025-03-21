# Stage 1: Build the Quasar PWA
FROM node:22-slim AS builder

RUN corepack enable \
    && corepack prepare pnpm@latest --activate \
    && apt-get update \
    && apt-get install -y python3 make g++ \
    && echo "shamefully-hoist=true" > .npmrc \
    && echo "node-linker=hoisted" >> .npmrc

WORKDIR /app

COPY . .

RUN pnpm install


# Copy all remaining files
ARG COMMITHASH
ARG BUILDTIME
ENV COMMITHASH=${COMMITHASH}
ENV BUILDTIME=${BUILDTIME}

RUN pnpm build

# Stage 2: Serve the app using Nginx
FROM nginx:stable-alpine

# Create nginx config directory if it doesn't exist
RUN mkdir -p /etc/nginx/conf.d

# Copy nginx configuration
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Create a non-root user and group
RUN addgroup -S app && adduser -S -D -H -G app -s /sbin/nologin app
    
# Copy the built files from builder stage
COPY --from=builder /app/dist/pwa /usr/share/nginx/html
  
# Expose port 80
EXPOSE 80

# Launch Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]