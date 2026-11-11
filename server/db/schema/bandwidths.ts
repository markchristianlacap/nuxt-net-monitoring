import { doublePrecision, pgTable, serial, timestamp, varchar } from 'drizzle-orm/pg-core'

export const bandwidths = pgTable('bandwidths', {
  id: serial('id').primaryKey(),
  host: varchar('host', { length: 255 }).notNull(),
  displayName: varchar('displayName', { length: 255 }),
  interface: varchar('interface', { length: 255 }).notNull().default(''),
  inMbps: doublePrecision('inMbps').notNull(),
  outMbps: doublePrecision('outMbps').notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
})

export type Bandwidth = typeof bandwidths.$inferSelect
export type NewBandwidth = typeof bandwidths.$inferInsert
