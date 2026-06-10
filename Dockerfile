# Stage 1: Build the Quasar PWA
FROM --platform=$BUILDPLATFORM node:24-slim AS builder

ENV PNPM_STORE_PATH=/pnpm/store

RUN corepack enable \
    && corepack prepare pnpm@11.4.0 --activate \
    && apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
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
FROM alpine:3.24 AS runtime

RUN apk add --no-cache --upgrade nginx nginx-mod-http-brotli \
    && mkdir -p /usr/share/nginx/html /run/nginx /etc/nginx/http.d /var/lib/nginx/tmp \
    && addgroup -S app \
    && adduser -S -D -H -G app -s /sbin/nologin app \
    && chown -R app:app /usr/share/nginx/html /run/nginx /var/lib/nginx /var/log/nginx

COPY docker/nginx.conf /etc/nginx/http.d/default.conf

# Copy the built files from builder stage
COPY --from=builder /app/dist/pwa /usr/share/nginx/html

USER app

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
