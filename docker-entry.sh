#!/bin/sh
set -e

echo "Waiting for database to be ready..."
# Wait for postgres to be ready
until PGPASSWORD=$NUXT_DB_PASSWORD psql -h "$NUXT_DB_HOST" -U "$NUXT_DB_USER" -d "$NUXT_DB_NAME" -c '\q' 2>/dev/null; do
  echo "Waiting for PostgreSQL..."
  sleep 2
done

echo "Database is ready!"

# Check if migrations table exists
TABLE_EXISTS=$(PGPASSWORD=$NUXT_DB_PASSWORD psql -h "$NUXT_DB_HOST" -U "$NUXT_DB_USER" -d "$NUXT_DB_NAME" -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'kysely_migration');")

if [ "$TABLE_EXISTS" = "t" ]; then
  echo "Database migrations table exists, checking migration status..."
else
  echo "Database is empty, running initial migrations..."
fi

# Run migrations
echo "Running database migrations..."
pnpm exec kysely migrate latest

echo "Migrations complete!"

# Execute the main command
exec "$@"

