#!/bin/sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

exec devimint wasm-test-setup --exec sh -c '
  script_dir=$1
  shift
  "$script_dir/restart_esplora_with_cors.sh"

  if [ "$#" -ge 2 ] && [ "$1" = "$2" ]; then
    shift
  fi

  exec "$@"
' sh "$SCRIPT_DIR" "$@"
