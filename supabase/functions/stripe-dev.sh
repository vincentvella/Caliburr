#!/bin/bash
# Forwards Stripe test events to the deployed stripe-webhook Edge Function.
#
# Temporarily swaps all Stripe secrets in Supabase to test values,
# forwards events, then restores production secrets on exit.
#
# Requires:
#   - Stripe CLI (brew install stripe/stripe-cli/stripe)
#   - supabase/functions/.env.local with PROD_* and TEST_* values (see .env.local.example)
#
# Usage: make stripe-dev

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env.local"
ENV_EXAMPLE="$SCRIPT_DIR/.env.local.example"
PROJECT_REF=rmudbcyozoddlsxklxhq
FUNCTION_URL="https://$PROJECT_REF.supabase.co/functions/v1/stripe-webhook"

if ! command -v stripe >/dev/null 2>&1; then
  echo "✗ Stripe CLI not found. Install it:"
  echo "  brew install stripe/stripe-cli/stripe"
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "✗ Missing $ENV_FILE"
  echo "  Copy $ENV_EXAMPLE and fill in your values."
  exit 1
fi

# Load env file
set -a; source "$ENV_FILE"; set +a

# Validate required vars
for var in PROD_STRIPE_WEBHOOK_SECRET PROD_STRIPE_SECRET_KEY PROD_STRIPE_MONTHLY_PRICE_ID PROD_STRIPE_ANNUAL_PRICE_ID \
           TEST_STRIPE_SECRET_KEY TEST_STRIPE_MONTHLY_PRICE_ID TEST_STRIPE_ANNUAL_PRICE_ID; do
  if [ -z "${!var}" ]; then
    echo "✗ $var not set in $ENV_FILE"
    exit 1
  fi
done

echo "▶ Getting local webhook signing secret from Stripe CLI..."
DEV_WEBHOOK_SECRET=$(stripe listen --print-secret 2>/dev/null)
if [ -z "$DEV_WEBHOOK_SECRET" ]; then
  echo "✗ Could not get webhook secret — are you logged in? Run: stripe login"
  exit 1
fi
echo "  Dev webhook secret: $DEV_WEBHOOK_SECRET"

echo ""
echo "▶ Swapping Stripe secrets in Supabase to test values..."
bunx supabase secrets set \
  STRIPE_WEBHOOK_SECRET="$DEV_WEBHOOK_SECRET" \
  STRIPE_SECRET_KEY="$TEST_STRIPE_SECRET_KEY" \
  STRIPE_MONTHLY_PRICE_ID="$TEST_STRIPE_MONTHLY_PRICE_ID" \
  STRIPE_ANNUAL_PRICE_ID="$TEST_STRIPE_ANNUAL_PRICE_ID" \
  --project-ref "$PROJECT_REF"

bunx supabase functions deploy stripe-webhook --no-verify-jwt --project-ref "$PROJECT_REF"
bunx supabase functions deploy stripe-checkout --no-verify-jwt --project-ref "$PROJECT_REF"
echo "  ✓ Deployed with test secrets"

restore() {
  echo ""
  echo "▶ Restoring Stripe secrets to production values..."
  bunx supabase secrets set \
    STRIPE_WEBHOOK_SECRET="$PROD_STRIPE_WEBHOOK_SECRET" \
    STRIPE_SECRET_KEY="$PROD_STRIPE_SECRET_KEY" \
    STRIPE_MONTHLY_PRICE_ID="$PROD_STRIPE_MONTHLY_PRICE_ID" \
    STRIPE_ANNUAL_PRICE_ID="$PROD_STRIPE_ANNUAL_PRICE_ID" \
    --project-ref "$PROJECT_REF"
  bunx supabase functions deploy stripe-webhook --no-verify-jwt --project-ref "$PROJECT_REF"
  bunx supabase functions deploy stripe-checkout --no-verify-jwt --project-ref "$PROJECT_REF"
  echo "  ✓ Restored. Production is active again."
}
trap restore INT TERM EXIT

echo ""
echo "▶ Forwarding Stripe events → $FUNCTION_URL"
echo "  Go through checkout on the web app, or use: stripe trigger checkout.session.completed"
echo "  Press Ctrl+C to stop and restore production secrets."
echo ""

stripe listen --forward-to "$FUNCTION_URL"
