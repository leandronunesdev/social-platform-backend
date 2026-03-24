#!/usr/bin/env bash
# Remote deploy helper — stdin-fed over SSH from GitHub Actions.
# Usage (from runner): ssh ... VAR=value ... bash -s -- <staging|production> < scripts/gh-ec2-deploy.sh
# Expects env: NODE_ENV, PORT, API_BASE_URL, DATABASE_URL, JWT_*, CORS_ORIGIN, SES_*, EMAIL_FROM

set -euo pipefail

ENV_TYPE="${1:-}"
case "$ENV_TYPE" in
  staging | production) ;;
  *)
    echo "Usage: bash -s -- staging|production" >&2
    exit 1
    ;;
esac

cd ~/social-platform-backend || exit 1

git fetch origin
if [ "$ENV_TYPE" = "staging" ]; then
  git reset --hard origin/develop
  ENV_FILE=".env.staging"
else
  git reset --hard origin/main
  ENV_FILE=".env.production"
fi

{
  printf '%s\n' "NODE_ENV=${NODE_ENV:-}"
  printf '%s\n' "PORT=${PORT:-}"
  printf '%s\n' "DATABASE_URL=${DATABASE_URL:-}"
  printf '%s\n' "JWT_SECRET=${JWT_SECRET:-}"
  printf '%s\n' "JWT_EXPIRES_IN=${JWT_EXPIRES_IN:-}"
  printf '%s\n' "CORS_ORIGIN=${CORS_ORIGIN:-}"
  printf '%s\n' "API_BASE_URL=${API_BASE_URL:-}"
  printf '%s\n' "SES_IAM_USER=${SES_IAM_USER:-}"
  printf '%s\n' "SES_SMTP_USER=${SES_SMTP_USER:-}"
  printf '%s\n' "SES_SMTP_PASS=${SES_SMTP_PASS:-}"
  printf '%s\n' "SES_SMTP_HOST=${SES_SMTP_HOST:-}"
  printf '%s\n' "SES_SMTP_PORT=${SES_SMTP_PORT:-}"
  printf '%s\n' "EMAIL_FROM=${EMAIL_FROM:-}"
} >"$ENV_FILE"

chmod 600 "$ENV_FILE"
./scripts/deploy-aws.sh "$ENV_TYPE"
