import type { Kysely } from 'kysely'
import type { Database } from '../types'
import { sql } from 'kysely'

export async function up(db: Kysely<Database>): Promise<void> {
  await db.schema
    .createTable('speedtest_results')
    .addColumn('id', 'serial', col => col.primaryKey())
    .addColumn('timestamp', 'timestamptz', col => col.notNull().defaultTo(sql`now()`))
    .addColumn('download', 'integer', col => col.notNull())
    .addColumn('upload', 'integer', col => col.notNull())
    .addColumn('latency', 'numeric', col => col.notNull())
    .addColumn('isp', 'varchar(255)', col => col.notNull())
    .addColumn('ip', 'varchar(45)', col => col.notNull())
    .addColumn('url', 'text', col => col.notNull())
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('speedtest_results').ifExists().execute()
}
