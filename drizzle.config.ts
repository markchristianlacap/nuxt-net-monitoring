import process from 'node:process'
import { defineConfig } from 'drizzle-kit'
import 'dotenv/config'

export default defineConfig({
  dialect: 'postgresql',
  schema: './server/db/schema',
  out: './server/db/migrations',
  dbCredentials: {
    host: process.env.NUXT_DB_HOST ?? 'localhost',
    port: Number(process.env.NUXT_DB_PORT ?? 5432),
    user: process.env.NUXT_DB_USER ?? 'postgres',
    password: process.env.NUXT_DB_PASSWORD ?? 'postgres',
    database: process.env.NUXT_DB_NAME ?? 'net-monitor',
    ssl: false,
  },
})
