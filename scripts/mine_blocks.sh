#!/bin/sh
set -eu

BITCOIND_URL="${FM_BITCOIND_URL:-}"

if [ -z "$BITCOIND_URL" ]; then
  echo "FM_BITCOIND_URL is required"
  exit 1
fi

BLOCKS="${1:-1}"
BITCOIND_WALLET_URL="$BITCOIND_URL"

case "$BLOCKS" in
  '' | *[!0-9]*)
    echo "blocks must be a positive integer"
    exit 1
    ;;
esac

if [ "$BLOCKS" -le 0 ]; then
  echo "blocks must be greater than zero"
  exit 1
fi

case "$BITCOIND_WALLET_URL" in
  */wallet/*) ;;
  */) BITCOIND_WALLET_URL="${BITCOIND_WALLET_URL}wallet/" ;;
  *) BITCOIND_WALLET_URL="${BITCOIND_WALLET_URL}/wallet/" ;;
esac

MINING_ADDRESS=$(
  curl -s -X POST "$BITCOIND_WALLET_URL" \
    -H 'Content-Type: application/json' \
    --data-binary '{"jsonrpc":"2.0","id":"getnewaddress","method":"getnewaddress","params":[]}' |
    sed -n 's/.*"result":"\([^"]*\)".*/\1/p'
)

if [ -z "$MINING_ADDRESS" ]; then
  echo "Failed to get mining address"
  exit 1
fi

curl -s -X POST "$BITCOIND_WALLET_URL" \
  -H 'Content-Type: application/json' \
  --data-binary "{\"jsonrpc\":\"2.0\",\"id\":\"mine_blocks\",\"method\":\"generatetoaddress\",\"params\":[$BLOCKS,\"$MINING_ADDRESS\"]}"
