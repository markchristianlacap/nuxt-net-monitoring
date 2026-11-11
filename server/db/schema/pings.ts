import { doublePrecision, pgTable, serial, timestamp, varchar } from 'drizzle-orm/pg-core'

export const pings = pgTable('pings', {
  id: serial('id').primaryKey(),
  host: varchar('host', { length: 255 }).notNull(),
  status: varchar('status', { length: 10 }).$type<'online' | 'offline'>().notNull(),
  latency: doublePrecision('latency'),
  timestamp: timestamp('timestamp', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
})

export type Ping = typeof pings.$inferSelect
export type NewPing = typeof pings.$inferInsert
