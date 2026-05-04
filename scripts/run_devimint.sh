#!/bin/sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

exec devimint wasm-test-setup --exec sh -c '
  script_dir=$1
  "$script_dir/restart_esplora_with_cors.sh"
  exec bash
' sh "$SCRIPT_DIR"
