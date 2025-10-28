import { defineConfig } from 'kysely-ctl'
import { db } from './server/db'

export default defineConfig({
  kysely: db,
  migrations: {
    migrationFolder: './server/db/migrations',
  },
  seeds: {
    seedFolder: './server/db/seeds',
  },
})
