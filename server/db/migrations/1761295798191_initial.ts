import type { Kysely } from 'kysely'
import type { Database } from '../types'
import { sql } from 'kysely'

export async function up(db: Kysely<Database>): Promise<void> {
  await db.schema
    .createTable('pings')
    .addColumn('id', 'serial', col => col.primaryKey())
    .addColumn('host', 'varchar(255)', col => col.notNull())
    .addColumn('status', 'varchar(10)', col => col.notNull())
    .addColumn('latency', 'double precision')
    .addColumn('timestamp', 'timestamptz', col => col.notNull().defaultTo(sql`now()`))
    .execute()

  await db.schema
    .createTable('bandwidths')
    .addColumn('id', 'serial', col => col.primaryKey())
    .addColumn('host', 'varchar(255)', col => col.notNull())
    .addColumn('inMbps', 'double precision', col => col.notNull())
    .addColumn('outMbps', 'double precision', col => col.notNull())
    .addColumn('timestamp', 'timestamptz', col => col.notNull().defaultTo(sql`now()`))
    .execute()
}

export async function down(db: Kysely<Database>): Promise<void> {
  await db.schema.dropTable('bandwidths').ifExists().execute()
  await db.schema.dropTable('pings').ifExists().execute()
}
