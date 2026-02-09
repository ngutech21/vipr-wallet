# Stage 1: Build the Quasar PWA
FROM node:22-slim AS builder

RUN corepack enable \
    && corepack prepare pnpm@10 --activate \
    && apt-get update \
    && apt-get install -y python3 make g++

WORKDIR /app

COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm build


# Copy all remaining files
ARG COMMITHASH
ARG BUILDTIME
ENV COMMITHASH=${COMMITHASH}
ENV BUILDTIME=${BUILDTIME}


# Stage 2: Serve the app using Nginx
FROM nginx:1-alpine-slim

RUN mkdir -p /etc/nginx/conf.d

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Create a non-root user and group
RUN addgroup -S app && adduser -S -D -H -G app -s /sbin/nologin app
    
# Copy the built files from builder stage
COPY --from=builder /app/dist/pwa /usr/share/nginx/html
  
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
