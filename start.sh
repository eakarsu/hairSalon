#!/usr/bin/env bash
set -euo pipefail

# Local demo credential bridge (Codex managed)
demo_credentials_project_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
if [ -f "$demo_credentials_project_dir/.env" ]; then
  while IFS= read -r demo_credentials_line || [ -n "$demo_credentials_line" ]; do
    case "$demo_credentials_line" in ''|'#'*) continue ;; esac
    demo_credentials_line="${demo_credentials_line#export }"
    demo_credentials_key="${demo_credentials_line%%=*}"
    demo_credentials_value="${demo_credentials_line#*=}"
    case "$demo_credentials_key" in
      NODE_ENV|ENABLE_DEMO_CREDENTIAL_AUTOFILL|DEMO_EMAIL|DEMO_PASSWORD|SEED_ADMIN_EMAIL|SEED_ADMIN_PASSWORD|SEED_USER_EMAIL|SEED_USER_PASSWORD|PROVISION_ADMIN_EMAIL|PROVISION_ADMIN_PASSWORD|BOOTSTRAP_ADMIN_EMAIL|BOOTSTRAP_ADMIN_PASSWORD|ADMIN_EMAIL|ADMIN_PASSWORD|DEFAULT_EMAIL|DEFAULT_PASSWORD|DEMO_TENANT|BOOTSTRAP_TENANT_SLUG|GOVERNANCE_TENANT_ID|TENANT_ID) ;;
      *) continue ;;
    esac
    [ -n "${!demo_credentials_key+x}" ] && continue
    demo_credentials_first="${demo_credentials_value:0:1}"
    demo_credentials_last="${demo_credentials_value: -1}"
    if { [ "$demo_credentials_first" = '"' ] && [ "$demo_credentials_last" = '"' ]; } || { [ "$demo_credentials_first" = "'" ] && [ "$demo_credentials_last" = "'" ]; }; then
      demo_credentials_value="${demo_credentials_value:1:${#demo_credentials_value}-2}"
    fi
    export "$demo_credentials_key=$demo_credentials_value"
  done < "$demo_credentials_project_dir/.env"
fi
demo_credentials_email=""
demo_credentials_password=""
demo_credentials_tenant="${DEMO_TENANT:-${BOOTSTRAP_TENANT_SLUG:-${GOVERNANCE_TENANT_ID:-${TENANT_ID:-}}}}"
demo_credentials_tenant="${DEMO_TENANT:-${BOOTSTRAP_TENANT_SLUG:-${GOVERNANCE_TENANT_ID:-${TENANT_ID:-}}}}"
demo_credentials_tenant="${DEMO_TENANT:-${BOOTSTRAP_TENANT_SLUG:-${GOVERNANCE_TENANT_ID:-${TENANT_ID:-}}}}"
demo_credentials_tenant="${DEMO_TENANT:-${BOOTSTRAP_TENANT_SLUG:-${GOVERNANCE_TENANT_ID:-${TENANT_ID:-}}}}"
demo_credentials_tenant="${DEMO_TENANT:-${BOOTSTRAP_TENANT_SLUG:-${GOVERNANCE_TENANT_ID:-${TENANT_ID:-}}}}"
if [ -n "${PROVISION_ADMIN_EMAIL:-}" ] && [ -n "${PROVISION_ADMIN_PASSWORD:-}" ]; then
  demo_credentials_email="$PROVISION_ADMIN_EMAIL"
  demo_credentials_password="$PROVISION_ADMIN_PASSWORD"
elif [ -n "${BOOTSTRAP_ADMIN_EMAIL:-}" ] && [ -n "${BOOTSTRAP_ADMIN_PASSWORD:-}" ]; then
  demo_credentials_email="$BOOTSTRAP_ADMIN_EMAIL"
  demo_credentials_password="$BOOTSTRAP_ADMIN_PASSWORD"
elif [ -n "${SEED_ADMIN_EMAIL:-}" ] && [ -n "${SEED_ADMIN_PASSWORD:-}" ]; then
  demo_credentials_email="$SEED_ADMIN_EMAIL"
  demo_credentials_password="$SEED_ADMIN_PASSWORD"
elif [ -n "${SEED_USER_EMAIL:-}" ] && [ -n "${SEED_USER_PASSWORD:-}" ]; then
  demo_credentials_email="$SEED_USER_EMAIL"
  demo_credentials_password="$SEED_USER_PASSWORD"
elif [ -n "${DEMO_EMAIL:-}" ] && [ -n "${DEMO_PASSWORD:-}" ]; then
  demo_credentials_email="$DEMO_EMAIL"
  demo_credentials_password="$DEMO_PASSWORD"
elif [ -n "${ADMIN_EMAIL:-}" ] && [ -n "${ADMIN_PASSWORD:-}" ]; then
  demo_credentials_email="$ADMIN_EMAIL"
  demo_credentials_password="$ADMIN_PASSWORD"
elif [ -n "${DEFAULT_EMAIL:-}" ] && [ -n "${DEFAULT_PASSWORD:-}" ]; then
  demo_credentials_email="$DEFAULT_EMAIL"
  demo_credentials_password="$DEFAULT_PASSWORD"
fi
if [ "${NODE_ENV:-development}" != production ] && [ "${ENABLE_DEMO_CREDENTIAL_AUTOFILL:-true}" = true ] && [ -n "$demo_credentials_email" ] && [ -n "$demo_credentials_password" ]; then
  export NEXT_PUBLIC_ENABLE_DEMO_CREDENTIAL_AUTOFILL=true
  export NEXT_PUBLIC_DEMO_EMAIL="$demo_credentials_email"
  export NEXT_PUBLIC_DEMO_PASSWORD="$demo_credentials_password"
  export VITE_ENABLE_DEMO_CREDENTIAL_AUTOFILL=true
  export VITE_DEMO_EMAIL="$demo_credentials_email"
  export VITE_DEMO_PASSWORD="$demo_credentials_password"
  export REACT_APP_ENABLE_DEMO_CREDENTIAL_AUTOFILL=true
  export REACT_APP_DEMO_EMAIL="$demo_credentials_email"
  export REACT_APP_DEMO_PASSWORD="$demo_credentials_password"
  if [ -n "$demo_credentials_tenant" ]; then
    export NEXT_PUBLIC_DEMO_TENANT="$demo_credentials_tenant"
    export VITE_DEMO_TENANT="$demo_credentials_tenant"
    export REACT_APP_DEMO_TENANT="$demo_credentials_tenant"
  else
    unset NEXT_PUBLIC_DEMO_TENANT VITE_DEMO_TENANT REACT_APP_DEMO_TENANT
  fi
else
  export NEXT_PUBLIC_ENABLE_DEMO_CREDENTIAL_AUTOFILL=false
  export VITE_ENABLE_DEMO_CREDENTIAL_AUTOFILL=false
  export REACT_APP_ENABLE_DEMO_CREDENTIAL_AUTOFILL=false
  unset NEXT_PUBLIC_DEMO_EMAIL NEXT_PUBLIC_DEMO_PASSWORD NEXT_PUBLIC_DEMO_TENANT
  unset VITE_DEMO_EMAIL VITE_DEMO_PASSWORD VITE_DEMO_TENANT
  unset REACT_APP_DEMO_EMAIL REACT_APP_DEMO_PASSWORD REACT_APP_DEMO_TENANT
fi
unset demo_credentials_email demo_credentials_password demo_credentials_tenant demo_credentials_project_dir demo_credentials_line demo_credentials_key demo_credentials_value demo_credentials_first demo_credentials_last

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

if [[ "${NODE_ENV:-development}" != production ]]; then
  BOOTSTRAP_ACKNOWLEDGEMENT=create-initial-admin node "$source_dir/scripts/provision-admin.cjs"
fi
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
