#!/usr/bin/env bash
# Measure Core Web Vitals for PACT URLs via the PageSpeed Insights API.
# Usage: ./scripts/measure-cwv.sh   (from repo root, or any directory)

set -euo pipefail

if ! command -v jq >/dev/null 2>&1; then
  echo "Error: jq is required but not installed." >&2
  echo "Install with: brew install jq" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE=".env.local"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: $ENV_FILE not found in $ROOT_DIR" >&2
  exit 1
fi

# shellcheck disable=SC2046
export $(grep PAGESPEED_API_KEY "$ENV_FILE" | xargs)

if [[ -z "${PAGESPEED_API_KEY:-}" ]]; then
  echo "Error: PAGESPEED_API_KEY is not set in $ENV_FILE" >&2
  exit 1
fi

URLS=(
  "https://pactwines.com"
  "https://pactwines.com/vin"
  "https://pactwines.com/product/punkahontas-2023"
)

STRATEGIES=(mobile desktop)

API_BASE="https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed"

format_lcp() {
  local ms="$1"
  if [[ -z "$ms" || "$ms" == "null" ]]; then
    echo "n/a"
  else
    awk -v ms="$ms" 'BEGIN { printf "%.1f s", ms / 1000 }'
  fi
}

format_cls() {
  local value="$1"
  local from_field="$2"
  if [[ -z "$value" || "$value" == "null" ]]; then
    echo "n/a"
  elif [[ "$from_field" == "true" ]]; then
    awk -v v="$value" 'BEGIN { printf "%.2f", v / 100 }'
  else
    awk -v v="$value" 'BEGIN { printf "%.2f", v }'
  fi
}

format_inp() {
  local ms="$1"
  if [[ -z "$ms" || "$ms" == "null" ]]; then
    echo "n/a"
  else
    printf "%s ms" "$ms"
  fi
}

format_score() {
  local score="$1"
  if [[ -z "$score" || "$score" == "null" ]]; then
    echo "n/a"
  else
    awk -v s="$score" 'BEGIN { printf "%.0f", s * 100 }'
  fi
}

measure() {
  local url="$1"
  local strategy="$2"

  local encoded_url
  encoded_url="$(jq -rn --arg u "$url" '$u | @uri')"

  local response http_code tmp_body
  tmp_body="$(mktemp)"
  http_code="$(curl -sS -w "%{http_code}" -o "$tmp_body" \
    "${API_BASE}?url=${encoded_url}&strategy=${strategy}&category=PERFORMANCE&key=${PAGESPEED_API_KEY}")"
  response="$(cat "$tmp_body")"
  rm -f "$tmp_body"

  if [[ "$http_code" != "200" ]]; then
    echo "Error: PageSpeed API HTTP $http_code for $url ($strategy)" >&2
    echo "$response" >&2
    return 1
  fi

  local api_error
  api_error="$(echo "$response" | jq -r '.error.message // empty')"
  if [[ -n "$api_error" ]]; then
    echo "Error: PageSpeed API returned an error for $url ($strategy): $api_error" >&2
    return 1
  fi

  local perf_score
  perf_score="$(echo "$response" | jq -r '.lighthouseResult.categories.performance.score // empty')"

  # Prefer CrUX field data; fall back to Lighthouse lab audits.
  local lcp_ms cls_value cls_field inp_ms

  lcp_ms="$(echo "$response" | jq -r '.loadingExperience.metrics.LARGEST_CONTENTFUL_PAINT_MS.percentile // empty')"
  if [[ -z "$lcp_ms" ]]; then
    lcp_ms="$(echo "$response" | jq -r '.lighthouseResult.audits["largest-contentful-paint"].numericValue // empty')"
  fi

  cls_value="$(echo "$response" | jq -r '.loadingExperience.metrics.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile // empty')"
  cls_field="true"
  if [[ -z "$cls_value" ]]; then
    cls_field="false"
    cls_value="$(echo "$response" | jq -r '.lighthouseResult.audits["cumulative-layout-shift"].numericValue // empty')"
  fi

  inp_ms="$(echo "$response" | jq -r '.loadingExperience.metrics.INTERACTION_TO_NEXT_PAINT.percentile // empty')"
  if [[ -z "$inp_ms" ]]; then
    inp_ms="$(echo "$response" | jq -r '.lighthouseResult.audits["interaction-to-next-paint"].numericValue // empty')"
  fi

  echo "=== $url — $strategy ==="
  printf "Performance : %s\n" "$(format_score "$perf_score")"
  printf "LCP         : %s\n" "$(format_lcp "$lcp_ms")"
  printf "CLS         : %s\n" "$(format_cls "$cls_value" "$cls_field")"
  printf "INP         : %s\n" "$(format_inp "$inp_ms")"
  echo
}

for url in "${URLS[@]}"; do
  for strategy in "${STRATEGIES[@]}"; do
    measure "$url" "$strategy"
  done
done
