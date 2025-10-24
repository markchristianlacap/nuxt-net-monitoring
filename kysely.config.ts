import { db } from './server/db'
import { defineConfig } from 'kysely-ctl'

export default defineConfig({
  kysely: db,
  migrations: {
    migrationFolder: './server/db/migrations'
  },
  seeds: {
    seedFolder: './server/db/seeds'
  }
})
