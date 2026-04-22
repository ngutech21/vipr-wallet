# Stage 1: Build the Quasar PWA
FROM node:24-slim AS builder

ARG COMMITHASH=development
ARG BUILDTIME
ARG APP_VERSION

RUN corepack enable \
    && corepack prepare pnpm@10 --activate \
    && apt-get update \
    && apt-get install -y python3 make g++

WORKDIR /app

COPY . .

RUN pnpm install --frozen-lockfile --strict-peer-dependencies
ENV COMMITHASH=${COMMITHASH}
ENV BUILDTIME=${BUILDTIME}
ENV APP_VERSION=${APP_VERSION}
RUN pnpm build


# Stage 2: Serve the app using Nginx
FROM alpine:3.23

RUN apk add --no-cache nginx nginx-mod-http-brotli \
    && mkdir -p /usr/share/nginx/html /run/nginx /etc/nginx/http.d

COPY docker/nginx.conf /etc/nginx/http.d/default.conf

# Create a non-root user and group
RUN addgroup -S app && adduser -S -D -H -G app -s /sbin/nologin app
    
# Copy the built files from builder stage
COPY --from=builder /app/dist/pwa /usr/share/nginx/html
  
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
