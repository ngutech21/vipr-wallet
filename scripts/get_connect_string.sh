#!/bin/sh
set -eu

FAUCET="${FAUCET:-http://localhost:15243}"

curl -X GET "${FAUCET}/connect-string" \
  -H 'Content-Type: text/plain' 
  