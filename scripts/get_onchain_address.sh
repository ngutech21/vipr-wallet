#!/bin/sh
set -eu

BITCOIND_URL="${FM_BITCOIND_URL:-}"

if [ -z "$BITCOIND_URL" ]; then
  echo "FM_BITCOIND_URL is required"
  exit 1
fi

LABEL="${1:-vipr-send-test}"
ADDRESS_TYPE="${2:-bech32}"
BITCOIND_WALLET_URL="$BITCOIND_URL"

case "$BITCOIND_WALLET_URL" in
  */wallet/*) ;;
  */) BITCOIND_WALLET_URL="${BITCOIND_WALLET_URL}wallet/" ;;
  *) BITCOIND_WALLET_URL="${BITCOIND_WALLET_URL}/wallet/" ;;
esac

RESPONSE=$(
  curl -s -X POST "$BITCOIND_WALLET_URL" \
    -H 'Content-Type: application/json' \
    --data-binary "{\"jsonrpc\":\"2.0\",\"id\":\"get_onchain_address\",\"method\":\"getnewaddress\",\"params\":[\"$LABEL\",\"$ADDRESS_TYPE\"]}"
)

ADDRESS=$(printf '%s' "$RESPONSE" | sed -n 's/.*"result":"\([^"]*\)".*/\1/p')

if [ -z "$ADDRESS" ]; then
  echo "$RESPONSE"
  echo "Failed to get onchain address"
  exit 1
fi

printf '%s\n' "$ADDRESS"
