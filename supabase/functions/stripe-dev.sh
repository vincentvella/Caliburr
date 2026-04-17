#!/bin/bash
# Forwards Stripe test events to the deployed stripe-webhook Edge Function.
#
# Temporarily swaps STRIPE_WEBHOOK_SECRET in Supabase to the Stripe CLI's
# local signing secret, forwards events, then reminds you to restore it.
#
# Requires:
#   - Stripe CLI (brew install stripe/stripe-cli/stripe)
#   - supabase/functions/.env.local with PROD_STRIPE_WEBHOOK_SECRET (your live whsec_)
#
# Usage: make stripe-dev

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env.local"
ENV_EXAMPLE="$SCRIPT_DIR/.env.local.example"
FUNCTION_URL="https://rmudbcyozoddlsxklxhq.supabase.co/functions/v1/stripe-webhook"

if ! command -v stripe >/dev/null 2>&1; then
  echo "✗ Stripe CLI not found. Install it:"
  echo "  brew install stripe/stripe-cli/stripe"
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "✗ Missing $ENV_FILE"
  echo "  Copy $ENV_EXAMPLE and fill in your production webhook secret."
  exit 1
fi

# Load env file
set -a; source "$ENV_FILE"; set +a

if [ -z "$PROD_STRIPE_WEBHOOK_SECRET" ]; then
  echo "✗ PROD_STRIPE_WEBHOOK_SECRET not set in $ENV_FILE"
  exit 1
fi

echo "▶ Getting local webhook signing secret from Stripe CLI..."
DEV_SECRET=$(stripe listen --print-secret 2>/dev/null)
if [ -z "$DEV_SECRET" ]; then
  echo "✗ Could not get webhook secret — are you logged in? Run: stripe login"
  exit 1
fi
echo "  Dev secret:  $DEV_SECRET"
echo "  Prod secret: $PROD_STRIPE_WEBHOOK_SECRET"

echo ""
echo "▶ Swapping STRIPE_WEBHOOK_SECRET in Supabase to dev secret..."
bunx supabase secrets set STRIPE_WEBHOOK_SECRET="$DEV_SECRET" --project-ref rmudbcyozoddlsxklxhq
bunx supabase functions deploy stripe-webhook --no-verify-jwt
echo "  ✓ Deployed with dev signing secret"

restore() {
  echo ""
  echo "▶ Restoring STRIPE_WEBHOOK_SECRET to production value..."
  bunx supabase secrets set STRIPE_WEBHOOK_SECRET="$PROD_STRIPE_WEBHOOK_SECRET" --project-ref rmudbcyozoddlsxklxhq
  bunx supabase functions deploy stripe-webhook --no-verify-jwt
  echo "  ✓ Restored. Production webhook is active again."
}
trap restore INT TERM EXIT

echo ""
echo "▶ Forwarding Stripe events → $FUNCTION_URL"
echo "  Resend events from the Stripe dashboard or use: stripe trigger checkout.session.completed"
echo "  Press Ctrl+C to stop and restore the production secret."
echo ""

stripe listen --forward-to "$FUNCTION_URL"
