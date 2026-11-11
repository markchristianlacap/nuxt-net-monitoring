#!/bin/sh
set -e

echo "Waiting for database to be ready..."
# Wait for postgres to be ready
until PGPASSWORD=$NUXT_DB_PASSWORD psql -h "$NUXT_DB_HOST" -U "$NUXT_DB_USER" -d "$NUXT_DB_NAME" -c '\q' 2>/dev/null; do
  echo "Waiting for PostgreSQL..."
  sleep 2
done

echo "Database is ready!"

# Run migrations
echo "Running database migrations..."
pnpm run db:migrate

echo "Migrations complete!"

# Execute the main command
exec "$@"
