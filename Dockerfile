# Stage 1: Build the Quasar PWA
FROM --platform=$BUILDPLATFORM node:24-slim AS builder

ENV PNPM_STORE_PATH=/pnpm/store

RUN corepack enable \
    && corepack prepare pnpm@11.1.1 --activate \
    && apt-get update \
    && apt-get install -y python3 make g++ \
    && pnpm config set store-dir ${PNPM_STORE_PATH} \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc index.html quasar.config.ts tsconfig.json ./
COPY src-pwa/tsconfig.json ./src-pwa/tsconfig.json

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --strict-peer-dependencies

COPY . .

ARG COMMITHASH
ARG APP_VERSION
ENV COMMITHASH=${COMMITHASH}
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
