import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'
import { organisations } from './organisations'

// Extends Supabase auth.users — id matches auth.users.id
export const users = pgTable('users', {
  // Must match the auth.users UUID — set by Supabase on sign-up
  id: uuid('id').primaryKey(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => organisations.id, { onDelete: 'cascade' }),
  fullName: text('full_name'),
  // admin | manager | viewer
  role: text('role').notNull().default('viewer'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
