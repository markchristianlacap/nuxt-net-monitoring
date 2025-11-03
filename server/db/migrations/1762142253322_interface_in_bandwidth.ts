import type { Kysely } from 'kysely'
import type { Database } from '../types'

export async function up(db: Kysely<Database>): Promise<void> {
  db.schema.alterTable('bandwidths')
    .addColumn('interface', 'varchar(255)', col => col.notNull().defaultTo(''))
    .execute()
}

export async function down(db: Kysely<Database>): Promise<void> {
  db.schema.alterTable('bandwidths').dropColumn('interface').execute()
}
