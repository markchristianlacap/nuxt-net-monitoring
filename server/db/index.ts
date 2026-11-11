import process from 'node:process'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema/index.js'

let host = process.env.NUXT_DB_HOST
let user = process.env.NUXT_DB_USER
let password = process.env.NUXT_DB_PASSWORD
let database = process.env.NUXT_DB_NAME
let port = process.env.NUXT_DB_PORT
if (typeof useRuntimeConfig !== 'undefined') {
  const config = useRuntimeConfig()
  host = config.DB_HOST
  user = config.DB_USER
  password = config.DB_PASSWORD
  database = config.DB_NAME
  port = config.DB_PORT
}

const pool = new Pool({
  host,
  user,
  password,
  database,
  port: Number(port),
})

export const db = drizzle(pool, { schema })
