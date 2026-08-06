import { pgTable, uuid, text, timestamp, jsonb, inet, index } from 'drizzle-orm/pg-core'
import { organisations } from './organisations'

// Immutable audit trail — no UPDATE or DELETE policies in RLS
// Written by PostgreSQL trigger functions, not application code
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organisations.id),
    // null for system/trigger actions
    userId: uuid('user_id'),
    // INSERT | UPDATE | DELETE (from TG_OP)
    action: text('action').notNull(),
    // table name (from TG_TABLE_NAME)
    resourceType: text('resource_type').notNull(),
    resourceId: uuid('resource_id').notNull(),
    // Previous state — null for INSERT
    oldValues: jsonb('old_values'),
    // New state — null for DELETE
    newValues: jsonb('new_values'),
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgIdIdx: index('audit_logs_org_id_idx').on(table.orgId),
    resourceIdx: index('audit_logs_resource_idx').on(table.resourceType, table.resourceId),
    createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),
  })
)

export type AuditLog = typeof auditLogs.$inferSelect

// ── Platform-level audit log ──────────────────────────────────────────────────
// Separate from per-tenant audit_logs. Never exposed to tenant users.
// Records every action taken by platform admins (Jawad / dev team).
export const platformAuditLog = pgTable(
  'platform_audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Email of the platform admin who took the action
    adminEmail: text('admin_email').notNull(),
    // e.g. 'org.viewed' | 'org.impersonated' | 'user.impersonated' | 'script.run'
    action: text('action').notNull(),
    targetOrgId: uuid('target_org_id'),
    targetUserId: uuid('target_user_id'),
    // Extra context — e.g. { page: '/admin/orgs/123', duration_ms: 412 }
    metadata: jsonb('metadata'),
    ipAddress: text('ip_address'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    adminEmailIdx: index('platform_audit_log_admin_email_idx').on(table.adminEmail),
    targetOrgIdx: index('platform_audit_log_target_org_idx').on(table.targetOrgId),
    createdAtIdx: index('platform_audit_log_created_at_idx').on(table.createdAt),
  })
)

export type PlatformAuditLog = typeof platformAuditLog.$inferSelect
