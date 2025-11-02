import type { Kysely } from 'kysely'
import type { Database } from '../types'
import { sql } from 'kysely'

export async function up(db: Kysely<Database>): Promise<void> {
  await db.schema
    .createTable('interface_info')
    .addColumn('id', 'serial', col => col.primaryKey())
    .addColumn('interfaceName', 'varchar(255)', col => col.notNull())
    .addColumn('interfaceIndex', 'integer', col => col.notNull())
    .addColumn('interfaceIP', 'varchar(255)')
    .addColumn('interfaceMAC', 'varchar(255)')
    .addColumn('interfaceSpeed', 'bigint')
    .addColumn('interfaceStatus', 'varchar(50)', col => col.notNull())
    .addColumn('timestamp', 'timestamptz', col => col.notNull().defaultTo(sql`now()`))
    .execute()
}

export async function down(db: Kysely<Database>): Promise<void> {
  await db.schema.dropTable('interface_info').ifExists().execute()
}
