import { sql, type Kysely } from 'kysely'
import type { Database } from '../types'

export async function up(db: Kysely<Database>): Promise<void> {
  await db.schema
    .createTable('pings')
    .addColumn('id', 'integer', col => col.primaryKey().autoIncrement())
    .addColumn('host', 'text', col => col.notNull())
    .addColumn('status', 'text', col => col.notNull()) // 'online' | 'offline'
    .addColumn('latency', 'real')
    .addColumn('timestamp', 'text', col =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .execute()

  // Create "bandwidths" table
  await db.schema
    .createTable('bandwidths')
    .addColumn('id', 'integer', col => col.primaryKey().autoIncrement())
    .addColumn('host', 'text', col => col.notNull())
    .addColumn('inMbps', 'real', col => col.notNull())
    .addColumn('outMbps', 'real', col => col.notNull())
    .addColumn('timestamp', 'text', col =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .execute()
}

export async function down(db: Kysely<Database>): Promise<void> {
  await db.schema.dropTable('bandwidths').ifExists().execute()
  await db.schema.dropTable('pings').ifExists().execute()
}
