.PHONY: screenshots deploy

## Capture iPhone + iPad screenshots, process, and output to
## .maestro/screenshots/submission/ ready for App Store upload.
## Requires one booted iPhone simulator and one booted iPad simulator.
screenshots:
	.maestro/run-screenshots.sh

## Deploy all Supabase Edge Functions and push DB migrations
deploy:
	bunx supabase db push --linked
	bunx supabase functions deploy --use-api --prune
