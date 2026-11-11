import { integer, numeric, pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core'

export const speedtestResults = pgTable('speedtest_results', {
  id: serial('id').primaryKey(),
  timestamp: timestamp('timestamp', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  download: integer('download').notNull(),
  upload: integer('upload').notNull(),
  latency: numeric('latency', { mode: 'number' }).notNull(),
  isp: varchar('isp', { length: 255 }).notNull(),
  ip: varchar('ip', { length: 45 }).notNull(),
  networkInterface: varchar('network_interface', { length: 255 }),
  url: text('url').notNull(),
})

export type Speedtest = typeof speedtestResults.$inferSelect
export type NewSpeedtest = typeof speedtestResults.$inferInsert
