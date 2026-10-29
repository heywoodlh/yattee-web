#!/bin/sh
set -eu
node /app/server.mjs &
node_pid=$!
nginx -g 'daemon off;' &
nginx_pid=$!
trap 'kill "$node_pid" "$nginx_pid" 2>/dev/null || true' INT TERM EXIT
wait "$node_pid"
