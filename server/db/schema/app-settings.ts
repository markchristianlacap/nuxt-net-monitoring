import { sql } from 'drizzle-orm'
import { check, integer, jsonb, pgTable, timestamp } from 'drizzle-orm/pg-core'

export const appSettings = pgTable('app_settings', {
  id: integer('id').primaryKey().default(1),
  settings: jsonb('settings').$type<AppSettings>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
}, table => [
  check('app_settings_singleton_check', sql`${table.id} = 1`),
])
