#!/bin/sh
# Run Prisma migrations in Docker container

set -e

echo "Running Prisma migrations..."

# Wait for database to be ready
until docker compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; do
  echo "Waiting for database to be ready..."
  sleep 2
done

# Run migrations
docker compose exec backend yarn prisma migrate deploy

echo "Migrations completed successfully!"
