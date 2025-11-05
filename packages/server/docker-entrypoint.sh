#!/bin/sh
set -e

if [ "$#" -gt 0 ]; then
  exec "$@"
fi

if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

if [ -z "$NEXT_PUBLIC_SUPERINTERFACE_BASE_URL" ]; then
  echo "NEXT_PUBLIC_SUPERINTERFACE_BASE_URL is required" >&2
  exit 1
fi

PORT="${PORT:-3000}"

echo "Starting Superinterface server on port ${PORT}"
exec node ./bin/index.cjs run server --port "${PORT}"
