#!/bin/sh
set -eu

BITCOIND_URL="${FM_BITCOIND_URL:-}"

if [ -z "$BITCOIND_URL" ]; then
  echo "FM_BITCOIND_URL is required"
  exit 1
fi

curl -s -X POST "$BITCOIND_URL" \
  -H 'Content-Type: application/json' \
  --data-binary '{"jsonrpc":"2.0","id":"get_block_height","method":"getblockcount","params":[]}' |
  sed -n 's/.*"result":\([0-9][0-9]*\).*/\1/p'
