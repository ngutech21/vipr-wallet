#!/bin/sh
set -eu

FAUCET="${FAUCET:-http://127.0.0.1:15243}"

curl -X GET "${FAUCET}/connect-string" \
  -H 'Content-Type: text/plain' 
  
