import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core'
import { organisations } from './organisations'

// Pending invitations for a teammate to join an org. Accepting one provisions
// a user row (role copied from the invitation) against the auth account that
// signs in with the matching email.
export const invitations = pgTable(
  'invitations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id').notNull().references(() => organisations.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    // admin | manager | viewer
    role: text('role').notNull().default('viewer'),
    token: text('token').notNull().unique(),
    invitedBy: uuid('invited_by'),
    // pending | accepted | revoked
    status: text('status').notNull().default('pending'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgIdIdx: index('invitations_org_id_idx').on(table.orgId),
    tokenIdx: index('invitations_token_idx').on(table.token),
  })
)

export type Invitation = typeof invitations.$inferSelect
export type NewInvitation = typeof invitations.$inferInsert
