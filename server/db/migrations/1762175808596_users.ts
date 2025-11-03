import type { Kysely } from 'kysely'
import type { Database } from '../types'
import { sql } from 'kysely'

export async function up(db: Kysely<Database>): Promise<void> {
  await db.schema
    .createTable('users')
    .addColumn('id', 'serial', col => col.primaryKey())
    .addColumn('username', 'varchar(255)', col => col.notNull().unique())
    .addColumn('password', 'varchar(255)', col => col.notNull())
    .addColumn('email', 'varchar(255)')
    .addColumn('name', 'varchar(255)')
    .addColumn('lastLoginAt', 'timestamptz')
    .addColumn('createdAt', 'timestamptz', col => col.notNull().defaultTo(sql`now()`))
    .addColumn('updatedAt', 'timestamptz', col => col.notNull().defaultTo(sql`now()`))
    .execute()

  // Create index for faster lookups
  await db.schema
    .createIndex('users_username_idx')
    .on('users')
    .column('username')
    .execute()
}

export async function down(db: Kysely<Database>): Promise<void> {
  await db.schema.dropTable('users').ifExists().execute()
}
