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
BITCOIND_WALLET_URL="$BITCOIND_URL"

case "$BITCOIND_WALLET_URL" in
  */wallet/*) ;;
  */) BITCOIND_WALLET_URL="${BITCOIND_WALLET_URL}wallet/" ;;
  *) BITCOIND_WALLET_URL="${BITCOIND_WALLET_URL}/wallet/" ;;
esac

curl -X POST "$BITCOIND_WALLET_URL" \
  -H 'Content-Type: application/json' \
  --data-binary "{\"jsonrpc\":\"2.0\",\"id\":\"pay_onchain\",\"method\":\"sendtoaddress\",\"params\":[\"$ADDRESS\",0.0021]}"

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

curl -X POST "$BITCOIND_WALLET_URL" \
  -H 'Content-Type: application/json' \
  --data-binary "{\"jsonrpc\":\"2.0\",\"id\":\"mine_blocks\",\"method\":\"generatetoaddress\",\"params\":[5,\"$MINING_ADDRESS\"]}"
