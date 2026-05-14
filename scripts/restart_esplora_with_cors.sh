#!/bin/sh
set -eu

CORS_ORIGIN="${ESPLORA_CORS_ORIGIN:-*}"
HOST="${FM_ESPLORA_HOST:-127.0.0.1}"
HTTP_PORT="${FM_PORT_ESPLORA:-}"
MONITORING_PORT="${FM_PORT_ESPLORA_CORS_MONITORING:-}"
BTC_RPC_PORT="${FM_PORT_BTC_RPC:-}"
BTC_DIR="${FM_BTC_DIR:-}"
ESPLORA_DIR="${FM_ESPLORA_DIR:-}"
LOGS_DIR="${FM_LOGS_DIR:-}"

if [ -z "$HTTP_PORT" ] || [ -z "$BTC_RPC_PORT" ]; then
  echo "Missing Devimint port environment. Run inside devimint wasm-test-setup."
  exit 1
fi

if [ -z "$MONITORING_PORT" ]; then
  if [ -z "${FM_PORT_ESPLORA_MONITORING:-}" ]; then
    echo "Missing Devimint esplora monitoring port. Run inside devimint wasm-test-setup."
    exit 1
  fi

  MONITORING_PORT=$((FM_PORT_ESPLORA_MONITORING + 1000))
fi

if [ -z "$BTC_DIR" ] || [ -z "$ESPLORA_DIR" ]; then
  echo "Missing Devimint data directories. Run inside devimint wasm-test-setup."
  exit 1
fi

if [ -z "$LOGS_DIR" ]; then
  LOGS_DIR="$ESPLORA_DIR"
fi

if ! command -v esplora >/dev/null 2>&1; then
  echo "esplora is not in PATH. Run from nix develop."
  exit 1
fi

PIDS=$(
  pgrep -f "esplora .*--http-addr=${HOST}:${HTTP_PORT}" 2>/dev/null || true
)

if [ -n "$PIDS" ]; then
  echo "$PIDS" | while IFS= read -r pid; do
    [ -n "$pid" ] || continue
    kill "$pid" 2>/dev/null || true
  done
fi

attempt=0
while [ "$attempt" -lt 50 ]; do
  if ! nc -z "$HOST" "$HTTP_PORT" >/dev/null 2>&1; then
    break
  fi

  attempt=$((attempt + 1))
  sleep 0.1
done

if nc -z "$HOST" "$HTTP_PORT" >/dev/null 2>&1; then
  echo "Timed out waiting for existing esplora on ${HOST}:${HTTP_PORT} to stop"
  exit 1
fi

mkdir -p "$LOGS_DIR"

nohup esplora \
  --daemon-dir="$BTC_DIR" \
  --db-dir="$ESPLORA_DIR" \
  --cookie=bitcoin:bitcoin \
  --network=regtest \
  --daemon-rpc-addr="${HOST}:${BTC_RPC_PORT}" \
  --http-addr="${HOST}:${HTTP_PORT}" \
  --monitoring-addr="${HOST}:${MONITORING_PORT}" \
  --jsonrpc-import \
  --cors="$CORS_ORIGIN" \
  >"$LOGS_DIR/esplora.log" 2>&1 &

attempt=0
while [ "$attempt" -lt 100 ]; do
  if curl -fsS "http://${HOST}:${HTTP_PORT}/blocks/tip/height" >/dev/null 2>&1; then
    echo "Restarted esplora with CORS ${CORS_ORIGIN} on ${HOST}:${HTTP_PORT}"
    exit 0
  fi

  attempt=$((attempt + 1))
  sleep 0.1
done

echo "Timed out waiting for esplora on ${HOST}:${HTTP_PORT}"
exit 1
