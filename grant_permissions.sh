#!/bin/bash
# -----------------------------------------------------------------------------
# This script grants the App Hosting backend the necessary permissions to access
# all required secrets during build and runtime.
#
# HOW TO RUN:
# 1. Make sure you are logged into the Firebase CLI: `firebase login`
# 2. Make the script executable: `chmod +x grant_permissions.sh`
# 3. Run the script: `./grant_permissions.sh`
# -----------------------------------------------------------------------------

echo "Detecting App Hosting backend..."

# Get the backend ID from the table output, skipping the header lines.
BACKEND_ID=$(firebase apphosting:backends:list | tail -n +4 | head -n -1 | awk '{print $2}')

if [ -z "$BACKEND_ID" ]; then
  echo "ERROR: Could not automatically detect the App Hosting backend ID."
  echo "Please try running 'firebase apphosting:backends:list' to ensure you have a backend."
  exit 1
fi

echo "Found backend ID: $BACKEND_ID"
echo "Granting access to production secrets..."

# List of all secrets used in apphosting.yaml
SECRETS=(
  "GEMINI_API_KEY"
  "LOCALCOIN_MNEMONIC"
  "STRIPE_SECRET_KEY_EUR"
  "STRIPE_SECRET_KEY_USD"
  "SMTP_HOST"
  "SMTP_PORT"
  "SMTP_USER"
  "SMTP_PASS"
  "SMTP_FROM"
  "ENCRYPTION_SECRET"
  "FIREBASE_ADMIN_SERVICE_ACCOUNT"
  "RECAPTCHA_SECRET_KEY"
  "NEXT_PUBLIC_CONTACT_EMAIL"
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_EUR"
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_USD"
  "NEXT_PUBLIC_EURUSD_RATE"
  "NEXT_PUBLIC_RECAPTCHA_SITE_KEY"
)

# Loop through the array and grant access to each secret
for secret in "${SECRETS[@]}"; do
  echo "Granting access to $secret..."
  # Explicitly use the --backend flag
  firebase apphosting:secrets:grantaccess "$secret" --backend "$BACKEND_ID"
  if [ $? -ne 0 ]; then
    echo "ERROR: Failed to grant access to $secret. Please check if the secret exists."
    exit 1
  fi
done

echo ""
echo "✅ All secret permissions have been granted successfully."
echo "You can now redeploy your application."
