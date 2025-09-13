#!/bin/sh
set -eu

FAUCET="${FAUCET:-http://localhost:15243}"

if [ $# -lt 1 ]; then
  echo "Usage: $0 <bolt11-invoice>"
  exit 1
fi

INVOICE="$1"

curl -X POST "${FAUCET}/pay" \
  -H 'Content-Type: text/plain' \
  --data-binary "$INVOICE"