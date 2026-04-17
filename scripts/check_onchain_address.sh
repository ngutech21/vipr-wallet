#!/bin/sh
set -eu

BITCOIND_URL="${FM_BITCOIND_URL:-}"

if [ $# -lt 1 ]; then
  echo "Usage: $0 <bitcoin-address>"
  exit 1
fi

if [ -z "$BITCOIND_URL" ]; then
  echo "FM_BITCOIND_URL is required"
  exit 1
fi

ADDRESS="$1"

curl -s -X POST "$BITCOIND_URL" \
  -H 'Content-Type: application/json' \
  --data-binary "{\"jsonrpc\":\"2.0\",\"id\":\"check_onchain_address\",\"method\":\"scantxoutset\",\"params\":[\"start\",[\"addr($ADDRESS)\"]]}"
