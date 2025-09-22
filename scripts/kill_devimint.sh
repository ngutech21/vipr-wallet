#!/bin/sh
set -eu

killall -q devimint || true
killall -q bitcoind || true
killall -q lnd || true
killall -q esplora || true
killall -q electrs || true
killall -q faucet || true   
killall -q fedimintd || true
killall -q gatewayd || true
killall -q reccuringd || true
