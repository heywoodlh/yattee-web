#!/bin/sh
set -eu
node /app/server.mjs &
exec nginx -g 'daemon off;'
