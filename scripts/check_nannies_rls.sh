#!/usr/bin/env bash
set -euo pipefail

if ! command -v curl >/dev/null 2>&1; then
  echo "ERROR: curl is required"
  exit 1
fi

SUPABASE_URL="${SUPABASE_URL:-}"
ANON_KEY="${ANON_KEY:-}"
USER_JWT="${USER_JWT:-}"
OWNER_USER_ID="${OWNER_USER_ID:-}"

if [[ -z "$SUPABASE_URL" || -z "$ANON_KEY" ]]; then
  cat <<'EOF'
Usage:
  SUPABASE_URL="https://<project-ref>.supabase.co" \
  ANON_KEY="<anon-key>" \
  USER_JWT="<user-jwt>" \
  OWNER_USER_ID="<auth-user-id>" \
  bash scripts/check_nannies_rls.sh

Required:
  SUPABASE_URL
  ANON_KEY

Optional:
  USER_JWT
  OWNER_USER_ID
EOF
  exit 1
fi

have_jq=0
if command -v jq >/dev/null 2>&1; then
  have_jq=1
fi

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

request() {
  local name="$1"
  local path="$2"
  local bearer="$3"
  local body_file="$tmp_dir/${name}.json"
  local status_file="$tmp_dir/${name}.status"

  curl -sS \
    -o "$body_file" \
    -w "%{http_code}" \
    "${SUPABASE_URL}${path}" \
    -H "apikey: ${ANON_KEY}" \
    -H "Authorization: Bearer ${bearer}" \
    > "$status_file"
}

print_json_summary() {
  local file="$1"

  if [[ "$have_jq" -eq 1 ]]; then
    jq '.' "$file"
  else
    cat "$file"
  fi
}

assert_no_pii() {
  local file="$1"
  local label="$2"

  if [[ "$have_jq" -eq 1 ]]; then
    local result
    result="$(jq -r '
      if type == "array" and length > 0 then
        .[0].payload // {}
      elif type == "object" then
        .payload // {}
      else
        {}
      end
      | {
          has_contact: has("contact"),
          has_documents: has("documents"),
          has_resume_normalized: has("resumeNormalized")
        }
    ' "$file")"
    echo "$label payload keys check:"
    echo "$result"

    local has_bad
    has_bad="$(jq -r '
      if type == "array" and length > 0 then
        .[0].payload // {}
      elif type == "object" then
        .payload // {}
      else
        {}
      end
      | (has("contact") or has("documents") or has("resumeNormalized"))
    ' "$file")"

    if [[ "$has_bad" == "true" ]]; then
      echo "FAIL: ${label} still exposes PII"
      exit 1
    fi
  else
    if grep -q '"contact"\|"documents"\|"resumeNormalized"' "$file"; then
      echo "FAIL: ${label} may still expose PII"
      exit 1
    fi
  fi
}

echo "== anon -> nannies_public =="
request "anon_public" "/rest/v1/nannies_public?select=id,payload,created_at&limit=1" "$ANON_KEY"
anon_public_status="$(cat "$tmp_dir/anon_public.status")"
echo "HTTP ${anon_public_status}"
if [[ "$anon_public_status" != "200" ]]; then
  print_json_summary "$tmp_dir/anon_public.json"
  echo "FAIL: anon cannot read nannies_public"
  exit 1
fi
assert_no_pii "$tmp_dir/anon_public.json" "anon nannies_public"

echo
echo "== anon -> raw nannies =="
request "anon_raw" "/rest/v1/nannies?select=id,payload,created_at&limit=1" "$ANON_KEY"
anon_raw_status="$(cat "$tmp_dir/anon_raw.status")"
echo "HTTP ${anon_raw_status}"
print_json_summary "$tmp_dir/anon_raw.json"
if [[ "$anon_raw_status" == "200" ]]; then
  if [[ "$have_jq" -eq 1 ]]; then
    raw_count="$(jq 'if type == "array" then length else 0 end' "$tmp_dir/anon_raw.json")"
    if [[ "$raw_count" -gt 0 ]]; then
      echo "FAIL: anon can read raw nannies rows"
      exit 1
    fi
  else
    if grep -q '"payload"' "$tmp_dir/anon_raw.json"; then
      echo "FAIL: anon may be reading raw nannies rows"
      exit 1
    fi
  fi
fi

if [[ -n "$USER_JWT" ]]; then
  echo
  echo "== authenticated -> nannies_public =="
  request "user_public" "/rest/v1/nannies_public?select=id,payload,created_at&limit=1" "$USER_JWT"
  user_public_status="$(cat "$tmp_dir/user_public.status")"
  echo "HTTP ${user_public_status}"
  if [[ "$user_public_status" != "200" ]]; then
    print_json_summary "$tmp_dir/user_public.json"
    echo "FAIL: authenticated user cannot read nannies_public"
    exit 1
  fi
  assert_no_pii "$tmp_dir/user_public.json" "authenticated nannies_public"

  echo
  echo "== authenticated -> raw nannies =="
  request "user_raw" "/rest/v1/nannies?select=id,user_id,payload,created_at&limit=5" "$USER_JWT"
  user_raw_status="$(cat "$tmp_dir/user_raw.status")"
  echo "HTTP ${user_raw_status}"
  print_json_summary "$tmp_dir/user_raw.json"

  if [[ "$user_raw_status" != "200" ]]; then
    echo "FAIL: authenticated raw-table read returned unexpected status"
    exit 1
  fi

  if [[ "$have_jq" -eq 1 ]]; then
    raw_count="$(jq 'if type == "array" then length else 0 end' "$tmp_dir/user_raw.json")"
    if [[ -n "$OWNER_USER_ID" ]]; then
      foreign_count="$(jq --arg owner "$OWNER_USER_ID" '
        if type == "array" then
          map(select(.user_id != $owner)) | length
        else
          0
        end
      ' "$tmp_dir/user_raw.json")"
      if [[ "$foreign_count" -gt 0 ]]; then
        echo "FAIL: authenticated user can read foreign raw nanny rows"
        exit 1
      fi
    else
      echo "WARN: OWNER_USER_ID not provided, cannot prove rows are owner-only"
      if [[ "$raw_count" -gt 1 ]]; then
        echo "WARN: multiple raw rows returned; verify they all belong to the same owner"
      fi
    fi
  else
    echo "WARN: jq not installed, skipping owner-only row verification"
  fi
else
  echo
  echo "WARN: USER_JWT not provided, skipping authenticated checks"
fi

echo
echo "OK: nannies RLS smoke test passed"
