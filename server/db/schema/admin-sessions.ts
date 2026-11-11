import { integer, pgTable, serial, timestamp, varchar } from 'drizzle-orm/pg-core'
import { adminUsers } from './admin-users'

export const adminSessions = pgTable('admin_sessions', {
  id: serial('id').primaryKey(),
  tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
  adminUserId: integer('admin_user_id').notNull().references(() => adminUsers.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
})
