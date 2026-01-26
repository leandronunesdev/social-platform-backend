#!/bin/sh
# AWS Deployment Script
# Run this on your EC2 instance after initial setup

set -e

echo "🚀 Starting AWS deployment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo "❌ .env.production file not found!"
    echo "Please create .env.production with your production environment variables."
    echo "See docs/env.production.template for reference."
    exit 1
fi

# Load environment variables
export $(cat .env.production | grep -v '^#' | xargs)

echo "📦 Building Docker image..."
docker-compose -f docker-compose.aws.yml --env-file .env.production build

echo "🗄️  Running database migrations..."
docker-compose -f docker-compose.aws.yml --env-file .env.production run --rm backend yarn prisma migrate deploy

echo "🚀 Starting services..."
docker-compose -f docker-compose.aws.yml --env-file .env.production up -d

echo "⏳ Waiting for services to be healthy..."
sleep 5

# Check health endpoint
if curl -f http://localhost:4000/health > /dev/null 2>&1; then
    echo "✅ Deployment successful! Health check passed."
    echo "🌐 API is running at: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):4000"
else
    echo "⚠️  Health check failed. Check logs with: docker-compose -f docker-compose.aws.yml logs backend"
    exit 1
fi

echo "📋 View logs with: docker-compose -f docker-compose.aws.yml logs -f backend"
echo "🛑 Stop services with: docker-compose -f docker-compose.aws.yml down"
