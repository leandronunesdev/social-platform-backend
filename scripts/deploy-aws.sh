#!/bin/sh
# AWS Deployment Script
# Run this on your EC2 instance after initial setup
#
# Usage: ./scripts/deploy-aws.sh [staging|production]
# Default: production (uses .env.production)

set -e

ENV_TYPE="${1:-production}"
ENV_FILE=".env.$ENV_TYPE"

# Use persistent env file in home dir if repo file doesn't exist (survives git pull/reset)
PERSISTENT_ENV="$HOME/.env.social-platform.$ENV_TYPE"
if [ ! -f "$ENV_FILE" ] && [ -f "$PERSISTENT_ENV" ]; then
    ENV_FILE="$PERSISTENT_ENV"
fi

echo "🚀 Starting AWS deployment ($ENV_TYPE)..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ $ENV_FILE file not found!"
    echo "Create it in the repo OR as $PERSISTENT_ENV (recommended - survives git pull)."
    echo "See docs/env.$ENV_TYPE.template for reference."
    exit 1
fi

# Load environment variables
export $(cat "$ENV_FILE" | grep -v '^#' | xargs)

echo "🧹 Freeing disk space (pruning unused Docker build cache and images)..."
docker builder prune -af 2>/dev/null || true
docker image prune -af 2>/dev/null || true

echo "📦 Building Docker image..."
docker build -t social-platform-backend .

echo "🗄️  Running database migrations..."
docker compose -f docker-compose.aws.yml --env-file "$ENV_FILE" run --rm backend yarn prisma migrate deploy

echo "🚀 Starting services..."
docker compose -f docker-compose.aws.yml --env-file "$ENV_FILE" up -d

echo "⏳ Waiting for services to be healthy..."
sleep 5

# Check health endpoint
if curl -f http://localhost:4000/health > /dev/null 2>&1; then
    echo "✅ Deployment successful! Health check passed."
    echo "🌐 API is running at: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):4000"
else
    echo "⚠️  Health check failed. Check logs with: docker compose -f docker-compose.aws.yml logs backend"
    exit 1
fi

echo "📋 View logs with: docker compose -f docker-compose.aws.yml logs -f backend"
echo "🛑 Stop services with: docker compose -f docker-compose.aws.yml down"
