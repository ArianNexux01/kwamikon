#!/bin/sh
set -e

npx prisma migrate deploy

# Seed is idempotent (upsert-based): safe to run on every start so ticket
# types and backoffice users exist even on a fresh volume.
node dist/prisma/seed.js

exec "$@"
