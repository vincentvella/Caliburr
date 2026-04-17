#!/bin/bash
# Runs stripe-webhook locally with Stripe CLI forwarding.
#
# Requires:
#   - Stripe CLI (brew install stripe/stripe-cli/stripe)
#   - supabase/functions/.env.local with STRIPE_SECRET_KEY, STRIPE_MONTHLY_PRICE_ID, STRIPE_ANNUAL_PRICE_ID
#
# Usage: make stripe-dev

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env.local"
ENV_EXAMPLE="$SCRIPT_DIR/.env.local.example"

if ! command -v stripe >/dev/null 2>&1; then
  echo "✗ Stripe CLI not found. Install it:"
  echo "  brew install stripe/stripe-cli/stripe"
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "✗ Missing $ENV_FILE"
  echo "  Copy $ENV_EXAMPLE and fill in your test keys."
  exit 1
fi

echo "▶ Getting local webhook signing secret from Stripe CLI..."
WEBHOOK_SECRET=$(stripe listen --print-secret 2>/dev/null)
if [ -z "$WEBHOOK_SECRET" ]; then
  echo "✗ Could not get webhook secret — are you logged in? Run: stripe login"
  exit 1
fi
echo "  Webhook secret: $WEBHOOK_SECRET"

echo ""
echo "▶ Starting supabase functions serve (stripe-webhook)..."
STRIPE_WEBHOOK_SECRET="$WEBHOOK_SECRET" \
  bunx supabase functions serve stripe-webhook \
    --no-verify-jwt \
    --env-file "$ENV_FILE" &
SERVE_PID=$!

# Give the function server a moment to start
sleep 2

echo ""
echo "▶ Forwarding Stripe events → http://localhost:54321/functions/v1/stripe-webhook"
echo "  Use the Stripe dashboard to resend events, or trigger a test checkout."
echo "  Press Ctrl+C to stop."
echo ""

cleanup() {
  echo ""
  echo "▶ Stopping..."
  kill "$SERVE_PID" 2>/dev/null
  exit 0
}
trap cleanup INT TERM

stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook

kill "$SERVE_PID" 2>/dev/null
