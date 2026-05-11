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
    targetValue: numeric('target_value', { precision: 10, scale: 4 }),
    targetOperator: text('target_operator').notNull(),
    targetValueMax: numeric('target_value_max', { precision: 10, scale: 4 }),
    unit: text('unit'),
    unitLabel: text('unit_label'),
    cadence: text('cadence').notNull(),
    dueDayRule: text('due_day_rule').default('5th_business_day'),
    creditFormula: text('credit_formula'),
    creditPerUnit: numeric('credit_per_unit', { precision: 10, scale: 2 }),
    creditPercentMrc: numeric('credit_percent_mrc', { precision: 5, scale: 2 }),
    creditCapPercent: numeric('credit_cap_percent', { precision: 5, scale: 2 }),
    creditCapAmount: numeric('credit_cap_amount', { precision: 12, scale: 2 }),
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

export type Contract = typeof contracts.$inferSelect
export type NewContract = typeof contracts.$inferInsert
export type ContractDocument = typeof contractDocuments.$inferSelect
export type NewContractDocument = typeof contractDocuments.$inferInsert
export type ContractKeyTerm = typeof contractKeyTerms.$inferSelect
export type KPI = typeof kpis.$inferSelect
export type NewKPI = typeof kpis.$inferInsert
