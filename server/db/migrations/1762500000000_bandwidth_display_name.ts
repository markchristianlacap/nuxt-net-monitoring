import type { Kysely } from 'kysely'
import type { Database } from '../types'

export async function up(db: Kysely<Database>): Promise<void> {
  await db.schema
    .alterTable('bandwidths')
    .addColumn('displayName', 'varchar(255)')
    .execute()
}

export async function down(db: Kysely<Database>): Promise<void> {
  await db.schema
    .alterTable('bandwidths')
    .dropColumn('displayName')
    .execute()
}
