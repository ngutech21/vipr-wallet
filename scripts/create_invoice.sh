#!/bin/sh
set -eu

FAUCET="${FAUCET:-http://localhost:15243}"

if [ $# -lt 1 ]; then
  echo "Usage: $0 <amount in sats>"
  exit 1
fi

# Ensure numeric
case "$1" in
  (*[!0-9]*|'') echo "Amount must be an integer (sats)"; exit 1;;
esac

AMOUNT_MSAT=$(( $1 * 1000 ))

curl -X POST "${FAUCET}/invoice" \
  -H 'Content-Type: text/plain' \
  --data-binary "$AMOUNT_MSAT"