.PHONY: screenshots screenshots-clean screenshots-process screenshots-all deploy-functions deploy

MAESTRO_DIR := .maestro
SCREENSHOT_DIR := $(MAESTRO_DIR)/screenshots

## Wipe existing screenshots
screenshots-clean:
	rm -f $(SCREENSHOT_DIR)/*.png
	rm -rf $(SCREENSHOT_DIR)/processed
	@echo "✓ Screenshots cleared"

## Run Maestro flows to capture screenshots (requires booted iOS simulator)
screenshots:
	@if [ -z "$$MAESTRO_EMAIL" ]; then \
		read -r -p "Maestro account email: " MAESTRO_EMAIL; \
		export MAESTRO_EMAIL; \
	fi; \
	if [ -z "$$MAESTRO_PASSWORD" ]; then \
		read -r -s -p "Maestro account password: " MAESTRO_PASSWORD; \
		echo; \
		export MAESTRO_PASSWORD; \
	fi; \
	MAESTRO_EMAIL=$$MAESTRO_EMAIL MAESTRO_PASSWORD=$$MAESTRO_PASSWORD maestro test $(MAESTRO_DIR)/screenshots.yaml

## Process raw screenshots (crop + resize backer badge to 1024x1024)
screenshots-process:
	INPUT_DIR="$(CURDIR)/$(SCREENSHOT_DIR)" OUTPUT_DIR="$(CURDIR)/$(SCREENSHOT_DIR)/processed" $(MAESTRO_DIR)/process-screenshots.sh

## Full pipeline: clean → capture → process
screenshots-all: screenshots-clean screenshots screenshots-process

## Deploy all Supabase Edge Functions and push DB migrations
deploy:
	bunx supabase db push --linked
	bunx supabase functions deploy --use-api --prune

