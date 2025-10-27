import type { Database } from './types.js'
import process from 'node:process'
import { Kysely, PostgresDialect } from 'kysely'
import { Pool } from 'pg'

const dialect = new PostgresDialect({
  pool: new Pool({
    host: process.env.NUXT_DB_HOST,
    user: process.env.NUXT_DB_USER,
    password: process.env.NUXT_DB_PASSWORD,
    database: process.env.NUXT_DB_NAME,
    port: Number(process.env.NUXT_DB_PORT || 5432),
  }),
})

// Database interface is passed to Kysely's constructor, and from now on, Kysely
// knows your database structure.
// Dialect is passed to Kysely's constructor, and from now on, Kysely knows how
// to communicate with your database.
export const db = new Kysely<Database>({
  dialect,
})
