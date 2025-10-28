import type { Database } from './types.js'
import process from 'node:process'
import { Kysely, PostgresDialect } from 'kysely'
import { Pool } from 'pg'

let host = process.env.NUXT_DB_HOST
let user = process.env.NUXT_DB_USER
let password = process.env.NUXT_DB_PASSWORD
let database = process.env.NUXT_DB_NAME
let port = process.env.NUXT_DB_PORT
if (typeof useRuntimeConfig !== 'undefined') {
  const config = useRuntimeConfig()
  host = config.db.host
  user = config.db.user
  password = config.db.password
  database = config.db.name
  port = config.db.port
}

const dialect = new PostgresDialect({
  pool: new Pool({
    host,
    user,
    password,
    database,
    port: Number(port),
  }),
})

// Database interface is passed to Kysely's constructor, and from now on, Kysely
// knows your database structure.
// Dialect is passed to Kysely's constructor, and from now on, Kysely knows how
// to communicate with your database.
export const db = new Kysely<Database>({
  dialect,
})
