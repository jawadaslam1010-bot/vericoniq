import { pgTable, uuid, text, timestamp, numeric, index } from 'drizzle-orm/pg-core'
import { organisations } from './organisations'

export const vendors = pgTable(
  'vendors',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organisations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    abn: text('abn'),
    // telco | it | cloud | facilities | security | construction | supply | property | custom
    serviceType: text('service_type').notNull(),
    contactName: text('contact_name'),
    contactEmail: text('contact_email'),
    // Where performance templates are emailed
    submissionEmail: text('submission_email'),
    // excel | webform | both | manual
    submissionMethod: text('submission_method').notNull().default('excel'),
    // active | inactive | terminated
    status: text('status').notNull().default('active'),
    // 0–100, weighted health score — recalculated on each new kpi_actuals submission
    healthScore: numeric('health_score', { precision: 5, scale: 2 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    // Soft delete — preserved for audit trail
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    orgIdIdx: index('vendors_org_id_idx').on(table.orgId),
    orgStatusIdx: index('vendors_org_status_idx').on(table.orgId, table.status),
    orgCreatedIdx: index('vendors_org_created_idx').on(table.orgId, table.createdAt),
  })
)

export type Vendor = typeof vendors.$inferSelect
export type NewVendor = typeof vendors.$inferInsert
