#!/bin/bash
# Script to set all environment variables in Railway

echo "🚀 Setting up environment variables in Railway..."

# Read .env file and set each variable in Railway
# Skip comments and empty lines

# Set application variables
railway variables --set APP_NAME="AniKwento"
railway variables --set APP_ENV="production"
railway variables --set APP_DEBUG="false"

# Set SMTP variables
railway variables --set SMTP_HOST="smtp.gmail.com"
railway variables --set SMTP_PORT="587"
railway variables --set SMTP_USERNAME="anikwentosms@gmail.com"
railway variables --set SMTP_PASSWORD="qahy icao wqnz hpmu"
railway variables --set SMTP_ENCRYPTION="tls"

# Set API keys
railway variables --set ELEVENLABS_API_KEY="REDACTED_ELEVENLABS_KEY"
railway variables --set FAL_API_KEY="b0852658-2b1a-49f9-afd9-81d038b6746f:ed19f385ea5b1a83bed43ead306d619a"

# Set R2 configuration
railway variables --set R2_ACCESS_KEY="73ee8edabb09e2c2d7feb12a2302f0f9"
railway variables --set R2_SECRET_KEY="fdcfe9fc493ab89dc1b51c9e0ed6b471d626b8e16b5a04541e5c72b69fb23b5c"
railway variables --set R2_ENDPOINT="https://5a68964aa57fac638f37b64ba1176de5.r2.cloudflarestorage.com"
railway variables --set R2_BUCKET="anikwento-stories-dev"
railway variables --set R2_PUBLIC_URL="https://anikwento-r2-public.thesamz20.workers.dev"
railway variables --set R2_REGION="auto"

echo "✅ Environment variables set successfully!"
echo ""
echo "Note: Database variables (DB_HOST, DB_USERNAME, DB_PASSWORD, DB_NAME)"
echo "will be automatically set by Railway when you add the MySQL database."
