#!/bin/bash

# Script to deploy Edge Function with environment variables from .env

echo "🚀 Deploying send-booking-confirmation Edge Function..."

# Load environment variables from .env
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
  echo "✅ Loaded environment variables from .env"
else
  echo "❌ .env file not found!"
  exit 1
fi

# Check required variables
if [ -z "$VITE_RESEND_API_KEY" ]; then
  echo "❌ VITE_RESEND_API_KEY not found in .env"
  exit 1
fi

if [ -z "$VITE_EMAIL_FROM" ]; then
  echo "❌ VITE_EMAIL_FROM not found in .env"
  exit 1
fi

echo ""
echo "📝 Setting Supabase secrets..."

# Set secrets in Supabase
supabase secrets set RESEND_API_KEY="$VITE_RESEND_API_KEY"
supabase secrets set EMAIL_FROM="$VITE_EMAIL_FROM"

if [ ! -z "$VITE_EMAIL_REPLY_TO" ]; then
  supabase secrets set EMAIL_REPLY_TO="$VITE_EMAIL_REPLY_TO"
fi

echo ""
echo "🚀 Deploying Edge Function..."

# Deploy the function
supabase functions deploy send-booking-confirmation

echo ""
echo "✅ Deploy complete!"
echo ""
echo "📧 Test your function:"
echo "   supabase functions invoke send-booking-confirmation --method POST --body '{...}'"
echo ""
echo "📊 View logs:"
echo "   supabase functions logs send-booking-confirmation"
