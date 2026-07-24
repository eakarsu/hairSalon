#!/usr/bin/env bash
set -euo pipefail

source_dir="$(cd "$(dirname "$0")" && pwd)"
if [[ -n "${RUNTIME_PROJECT_SOURCE:-}" && -d "$RUNTIME_PROJECT_SOURCE" ]]; then source_dir="$RUNTIME_PROJECT_SOURCE"; fi
cd "$source_dir"
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source ./.env
  set +a
fi

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

api_port="${API_PORT:-${BACKEND_PORT:-$PORT}}"
ui_port="${UI_PORT:-${CLIENT_PORT:-${FRONTEND_PORT:-}}}"
[[ "$api_port" =~ ^[0-9]+$ && "$ui_port" =~ ^[0-9]+$ ]] || { echo "API and UI ports must be numeric" >&2; exit 2; }
[[ "$api_port" != "$ui_port" ]] || { echo "API and UI ports must be different" >&2; exit 2; }
for assigned_port in "$api_port" "$ui_port"; do
  if lsof -tiTCP:"$assigned_port" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Assigned port $assigned_port is already in use; no process was stopped" >&2
    exit 1
  fi
done

child_pids=""
cleanup() {
  trap - EXIT INT TERM
  for child_pid in $child_pids; do kill "$child_pid" >/dev/null 2>&1 || true; done
  for child_pid in $child_pids; do wait "$child_pid" >/dev/null 2>&1 || true; done
}
trap cleanup EXIT INT TERM

HOST="${HOST:-127.0.0.1}" PORT="$ui_port" npm --prefix "$source_dir" start &
app_pid=$!
child_pids="$app_pid"

TARGET_HOST="${HOST:-127.0.0.1}" TARGET_PORT="$ui_port" PROXY_HOST="${HOST:-127.0.0.1}" PROXY_PORT="$api_port" \
  node "$source_dir/scripts/runtime-proxy.cjs" &
proxy_pid=$!
child_pids="$child_pids $proxy_pid"

echo "SalonFlow API gateway listening on http://${HOST:-127.0.0.1}:$api_port"
echo "SalonFlow UI listening on http://${HOST:-127.0.0.1}:$ui_port"

while kill -0 "$app_pid" >/dev/null 2>&1 && kill -0 "$proxy_pid" >/dev/null 2>&1; do sleep 1; done
runtime_result=1
if ! kill -0 "$app_pid" >/dev/null 2>&1; then
  wait "$app_pid" || runtime_result=$?
else
  wait "$proxy_pid" || runtime_result=$?
fi
exit "$runtime_result"
