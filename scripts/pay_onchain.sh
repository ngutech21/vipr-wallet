#!/bin/sh
set -eu

BITCOIND_URL="${FM_BITCOIND_URL:-}"

if [ $# -lt 1 ]; then
  echo "Usage: $0 <bitcoin-address> [amount-sats]"
  exit 1
fi

if [ -z "$BITCOIND_URL" ]; then
  echo "FM_BITCOIND_URL is required"
  exit 1
fi

ADDRESS="$1"
AMOUNT_SATS="${2:-210000}"
BITCOIND_WALLET_URL="$BITCOIND_URL"

case "$AMOUNT_SATS" in
  '' | *[!0-9]*)
    echo "amount-sats must be a positive integer"
    exit 1
    ;;
esac

if [ "$AMOUNT_SATS" -le 0 ]; then
  echo "amount-sats must be greater than zero"
  exit 1
fi

AMOUNT_BTC=$(awk "BEGIN { printf \"%.8f\", $AMOUNT_SATS / 100000000 }")

case "$BITCOIND_WALLET_URL" in
  */wallet/*) ;;
  */) BITCOIND_WALLET_URL="${BITCOIND_WALLET_URL}wallet/" ;;
  *) BITCOIND_WALLET_URL="${BITCOIND_WALLET_URL}/wallet/" ;;
esac

curl -X POST "$BITCOIND_WALLET_URL" \
  -H 'Content-Type: application/json' \
  --data-binary "{\"jsonrpc\":\"2.0\",\"id\":\"pay_onchain\",\"method\":\"sendtoaddress\",\"params\":[\"$ADDRESS\",$AMOUNT_BTC]}"

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
  --data-binary "{\"jsonrpc\":\"2.0\",\"id\":\"mine_blocks\",\"method\":\"generatetoaddress\",\"params\":[50,\"$MINING_ADDRESS\"]}"
