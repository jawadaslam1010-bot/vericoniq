import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'

export const organisations = pgTable('organisations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  // starter | professional | enterprise
  plan: text('plan').notNull().default('starter'),
  // buyer | vendor | both (vendor side added in Sprint 11)
  orgType: text('org_type').notNull().default('buyer'),
  abn: text('abn'),
  industry: text('industry'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type Organisation = typeof organisations.$inferSelect
export type NewOrganisation = typeof organisations.$inferInsert
