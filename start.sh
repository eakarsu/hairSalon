#!/usr/bin/env bash
set -euo pipefail

source_dir="$(cd "$(dirname "$0")" && pwd)"
if [[ -n "${RUNTIME_PROJECT_SOURCE:-}" && -d "$RUNTIME_PROJECT_SOURCE" ]]; then source_dir="$RUNTIME_PROJECT_SOURCE"; fi

: "${DATABASE_URL:?DATABASE_URL must be set}"
: "${PORT:?PORT must be set explicitly}"
: "${NEXTAUTH_URL:?NEXTAUTH_URL must be set}"
: "${NEXTAUTH_SECRET:?NEXTAUTH_SECRET must be set}"

if [[ "${NODE_ENV:-}" != "production" && "${BOOTSTRAP_ACKNOWLEDGEMENT:-}" == "create-initial-admin" ]]; then
  export CUSTOMER_ACCESS_SECRET="${CUSTOMER_ACCESS_SECRET:-${SESSION_SECRET:?SESSION_SECRET must be set for runtime acceptance}}"
  export FIELD_WEBHOOK_SECRET="${FIELD_WEBHOOK_SECRET:-${JWT_SECRET:?JWT_SECRET must be set for runtime acceptance}}"
fi

: "${CUSTOMER_ACCESS_SECRET:?CUSTOMER_ACCESS_SECRET must be set}"
: "${FIELD_WEBHOOK_SECRET:?FIELD_WEBHOOK_SECRET must be set}"

if [ "${#NEXTAUTH_SECRET}" -lt 32 ] || [ "${#CUSTOMER_ACCESS_SECRET}" -lt 32 ] || [ "${#FIELD_WEBHOOK_SECRET}" -lt 32 ]; then
  echo "NEXTAUTH_SECRET, CUSTOMER_ACCESS_SECRET, and FIELD_WEBHOOK_SECRET must each contain at least 32 characters" >&2
  exit 1
fi

exec npm --prefix "$source_dir" start
