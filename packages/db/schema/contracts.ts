import { pgTable, uuid, text, timestamp, date, boolean, integer, numeric, index } from 'drizzle-orm/pg-core'
import { organisations } from './organisations'
import { vendors } from './vendors'

export const contracts = pgTable(
  'contracts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id').notNull().references(() => organisations.id, { onDelete: 'cascade' }),
    vendorId: uuid('vendor_id').notNull().references(() => vendors.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    contractNumber: text('contract_number'),
    status: text('status').notNull().default('active'),
    startDate: date('start_date'),
    endDate: date('end_date'),
    noticePeriodDays: integer('notice_period_days'),
    noticeDeadline: date('notice_deadline'),
    autoRenewal: boolean('auto_renewal').notNull().default(false),
    autoRenewalMonths: integer('auto_renewal_months'),
    annualValue: numeric('annual_value', { precision: 12, scale: 2 }),
    monthlyValue: numeric('monthly_value', { precision: 12, scale: 2 }),
    currency: text('currency').notNull().default('AUD'),
    extractionStatus: text('extraction_status').notNull().default('pending'),
    aiExtractionNotes: text('ai_extraction_notes'),
    perspective: text('perspective').notNull().default('buyer'),
    // Renewal reminders — track the last stage emailed (90 | 60 | 30 | 0) to avoid duplicates
    renewalReminderStage: integer('renewal_reminder_stage'),
    renewalReminderSentAt: timestamp('renewal_reminder_sent_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgIdIdx: index('contracts_org_id_idx').on(table.orgId),
    vendorIdIdx: index('contracts_vendor_id_idx').on(table.vendorId),
  })
)

export const contractDocuments = pgTable(
  'contract_documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contractId: uuid('contract_id').notNull().references(() => contracts.id, { onDelete: 'cascade' }),
    orgId: uuid('org_id').notNull().references(() => organisations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    docType: text('doc_type').notNull(),
    hierarchyOrder: integer('hierarchy_order').notNull().default(4),
    storagePath: text('storage_path').notNull(),
    originalStoragePath: text('original_storage_path'),
    fileSizeBytes: integer('file_size_bytes'),
    pageCount: integer('page_count'),
    extractedText: text('extracted_text'),
    supersedesDocId: uuid('supersedes_doc_id'),
    supersedesClause: text('supersedes_clause'),
    uploadedBy: uuid('uploaded_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    contractIdIdx: index('contract_docs_contract_id_idx').on(table.contractId),
    orgIdIdx: index('contract_docs_org_id_idx').on(table.orgId),
  })
)

export const contractKeyTerms = pgTable(
  'contract_key_terms',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contractId: uuid('contract_id').notNull().references(() => contracts.id, { onDelete: 'cascade' }),
    orgId: uuid('org_id').notNull().references(() => organisations.id, { onDelete: 'cascade' }),
    termType: text('term_type').notNull(),
    label: text('label').notNull(),
    value: text('value').notNull(),
    clauseRef: text('clause_ref'),
    sourceDocId: uuid('source_doc_id'),
    isAiFlagged: boolean('is_ai_flagged').notNull().default(false),
    flagReason: text('flag_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    contractIdIdx: index('key_terms_contract_id_idx').on(table.contractId),
  })
)

export const kpis = pgTable(
  'kpis',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contractId: uuid('contract_id').notNull().references(() => contracts.id, { onDelete: 'cascade' }),
    orgId: uuid('org_id').notNull().references(() => organisations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    kpiType: text('kpi_type').notNull(),
    category: text('category'),
    targetValue: numeric('target_value', { precision: 20, scale: 4 }),
    targetOperator: text('target_operator').notNull(),
    targetValueMax: numeric('target_value_max', { precision: 20, scale: 4 }),
    unit: text('unit'),
    unitLabel: text('unit_label'),
    cadence: text('cadence').notNull(),
    dueDayRule: text('due_day_rule').default('5th_business_day'),
    resultType: text('result_type').notNull().default('numeric'), // numeric | binary
    creditFormula: text('credit_formula'),
    creditPerUnit: numeric('credit_per_unit', { precision: 20, scale: 4 }),
    creditPercentMrc: numeric('credit_percent_mrc', { precision: 10, scale: 4 }),
    creditCapPercent: numeric('credit_cap_percent', { precision: 10, scale: 4 }),
    creditCapAmount: numeric('credit_cap_amount', { precision: 20, scale: 4 }),
    clauseRef: text('clause_ref'),
    sourceDocId: uuid('source_doc_id'),
    addedBy: text('added_by').notNull(),
    addedByUserId: uuid('added_by_user_id'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    contractIdIdx: index('kpis_contract_id_idx').on(table.contractId),
    orgIdIdx: index('kpis_org_id_idx').on(table.orgId),
  })
)

export const submissionPeriods = pgTable(
  'submission_periods',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contractId: uuid('contract_id').notNull().references(() => contracts.id, { onDelete: 'cascade' }),
    orgId: uuid('org_id').notNull().references(() => organisations.id, { onDelete: 'cascade' }),
    periodStart: date('period_start').notNull(),
    periodEnd: date('period_end').notNull(),
    dueDate: date('due_date').notNull(),
    status: text('status').notNull().default('open'), // open | submitted | reviewing | locked
    reminderSentAt: timestamp('reminder_sent_at', { withTimezone: true }),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    contractIdIdx: index('periods_contract_id_idx').on(table.contractId),
    orgIdIdx: index('periods_org_id_idx').on(table.orgId),
  })
)

export const kpiResults = pgTable(
  'kpi_results',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    periodId: uuid('period_id').notNull().references(() => submissionPeriods.id, { onDelete: 'cascade' }),
    kpiId: uuid('kpi_id').notNull().references(() => kpis.id, { onDelete: 'cascade' }),
    contractId: uuid('contract_id').notNull().references(() => contracts.id, { onDelete: 'cascade' }),
    orgId: uuid('org_id').notNull().references(() => organisations.id, { onDelete: 'cascade' }),
    actualValue: numeric('actual_value', { precision: 20, scale: 4 }),
    submittedByEmail: text('submitted_by_email'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    comment: text('comment'),
    exemptionClaimed: boolean('exemption_claimed').notNull().default(false),
    exemptionReason: text('exemption_reason'),
    exemptionStatus: text('exemption_status').notNull().default('none'), // none | pending | approved | declined
    exemptionReviewedBy: uuid('exemption_reviewed_by'),
    exemptionReviewedAt: timestamp('exemption_reviewed_at', { withTimezone: true }),
    creditApplied: numeric('credit_applied', { precision: 20, scale: 4 }),
    resultStatus: text('result_status'), // met | risk | breach | exempt | null (not yet entered)
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    periodIdIdx: index('results_period_id_idx').on(table.periodId),
    kpiIdIdx: index('results_kpi_id_idx').on(table.kpiId),
    contractIdIdx: index('results_contract_id_idx').on(table.contractId),
  })
)

export type Contract = typeof contracts.$inferSelect
export type NewContract = typeof contracts.$inferInsert
export type ContractDocument = typeof contractDocuments.$inferSelect
export type NewContractDocument = typeof contractDocuments.$inferInsert
export type ContractKeyTerm = typeof contractKeyTerms.$inferSelect
export type KPI = typeof kpis.$inferSelect
export type NewKPI = typeof kpis.$inferInsert
export const portalTokens = pgTable(
  'portal_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    periodId: uuid('period_id').notNull().references(() => submissionPeriods.id, { onDelete: 'cascade' }),
    contractId: uuid('contract_id').notNull().references(() => contracts.id, { onDelete: 'cascade' }),
    orgId: uuid('org_id').notNull().references(() => organisations.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    vendorEmail: text('vendor_email'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    openedAt: timestamp('opened_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tokenIdx: index('portal_tokens_token_idx').on(table.token),
    periodIdIdx: index('portal_tokens_period_id_idx').on(table.periodId),
  })
)

export type SubmissionPeriod = typeof submissionPeriods.$inferSelect
export type KpiResult = typeof kpiResults.$inferSelect
export type PortalToken = typeof portalTokens.$inferSelect
