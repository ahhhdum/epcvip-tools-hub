#!/usr/bin/env bash
# Guarded production deploy for epcvip-tools-hub.
# Fails fast if Railway is linked to the wrong project/service/environment.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

EXPECTED_PROJECT_ID="8776c23c-21f9-49e6-ac92-51368ba38d50"
EXPECTED_PROJECT_NAME="epcvip.vip | Hub"
EXPECTED_SERVICE_NAME="epcvip-tools-hub"
EXPECTED_ENVIRONMENT="production"
EXPECTED_PUBLIC_DOMAIN="epcvip.vip"
EXPECTED_START_COMMAND='startCommand = "cd server && node dist/index.js"'

die() {
  echo "ERROR: $*" >&2
  exit 1
}

info() {
  echo "==> $*"
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Required command not found: $1"
}

extract_var() {
  local json="$1"
  local key="$2"
  python3 - "$json" "$key" <<'PY'
import json
import sys

payload = json.loads(sys.argv[1])
key = sys.argv[2]
value = payload.get(key, "")
print(value if value is not None else "")
PY
}

validate_repo_signature() {
  [[ -f "$REPO_ROOT/package.json" ]] || die "package.json not found. Run from epcvip-tools-hub repo."
  [[ -f "$REPO_ROOT/server/src/index.ts" ]] || die "server/src/index.ts not found. Run from epcvip-tools-hub repo."
  [[ -f "$REPO_ROOT/railway.toml" ]] || die "railway.toml not found. Run from epcvip-tools-hub repo."
  [[ ! -f "$REPO_ROOT/main.py" ]] || die "main.py detected at repo root. This looks like docs-site, not tools-hub."
  [[ ! -f "$REPO_ROOT/requirements.txt" ]] || die "requirements.txt detected at repo root. This looks like a Python project, not tools-hub."

  grep -Fq "$EXPECTED_START_COMMAND" "$REPO_ROOT/railway.toml" || die "Unexpected Railway startCommand in railway.toml."
}

validate_railway_linkage() {
  info "Checking Railway linkage..."
  local vars_json
  if ! vars_json="$(cd "$REPO_ROOT" && railway variables --json 2>/tmp/tools-hub-railway-vars.err)"; then
    cat /tmp/tools-hub-railway-vars.err >&2 || true
    die "Unable to read Railway variables. Ensure Railway CLI is logged in and this directory is linked."
  fi

  local project_id project_name service_name environment_name public_domain
  project_id="$(extract_var "$vars_json" "RAILWAY_PROJECT_ID")"
  project_name="$(extract_var "$vars_json" "RAILWAY_PROJECT_NAME")"
  service_name="$(extract_var "$vars_json" "RAILWAY_SERVICE_NAME")"
  environment_name="$(extract_var "$vars_json" "RAILWAY_ENVIRONMENT_NAME")"
  public_domain="$(extract_var "$vars_json" "RAILWAY_PUBLIC_DOMAIN")"

  local failures=0
  if [[ "$project_id" != "$EXPECTED_PROJECT_ID" ]]; then
    echo "  - Project ID mismatch: expected '$EXPECTED_PROJECT_ID', got '$project_id'" >&2
    failures=1
  fi
  if [[ "$project_name" != "$EXPECTED_PROJECT_NAME" ]]; then
    echo "  - Project name mismatch: expected '$EXPECTED_PROJECT_NAME', got '$project_name'" >&2
    failures=1
  fi
  if [[ "$service_name" != "$EXPECTED_SERVICE_NAME" ]]; then
    echo "  - Service mismatch: expected '$EXPECTED_SERVICE_NAME', got '$service_name'" >&2
    failures=1
  fi
  if [[ "$environment_name" != "$EXPECTED_ENVIRONMENT" ]]; then
    echo "  - Environment mismatch: expected '$EXPECTED_ENVIRONMENT', got '$environment_name'" >&2
    failures=1
  fi
  if [[ "$public_domain" != "$EXPECTED_PUBLIC_DOMAIN" ]]; then
    echo "  - Public domain mismatch: expected '$EXPECTED_PUBLIC_DOMAIN', got '$public_domain'" >&2
    failures=1
  fi

  if [[ "$failures" -ne 0 ]]; then
    cat <<EOF >&2

Refusing to deploy.
Relink this directory first, then retry:
  railway link --project "$EXPECTED_PROJECT_ID" --environment "$EXPECTED_ENVIRONMENT" --service "$EXPECTED_SERVICE_NAME"
EOF
    exit 1
  fi
}

deploy() {
  info "Deploying epcvip-tools-hub to production..."
  cd "$REPO_ROOT"
  railway up \
    --ci \
    --project "$EXPECTED_PROJECT_ID" \
    --service "$EXPECTED_SERVICE_NAME" \
    --environment "$EXPECTED_ENVIRONMENT"
}

main() {
  need_cmd railway
  need_cmd python3
  validate_repo_signature
  validate_railway_linkage
  deploy
  info "Deployment completed."
}

main "$@"
