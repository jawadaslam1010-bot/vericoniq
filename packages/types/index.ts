// Re-export all Drizzle-inferred types as the source of truth
export type {
  Organisation,
  NewOrganisation,
  User,
  NewUser,
  Vendor,
  NewVendor,
  AuditLog,
} from '@contractly/db'

// ─── Enums ──────────────────────────────────────────────────────────────────

export type OrgPlan = 'starter' | 'professional' | 'enterprise'
export type OrgType = 'buyer' | 'vendor' | 'both'
export type UserRole = 'admin' | 'manager' | 'viewer'

export type VendorServiceType =
  | 'telco'
  | 'it'
  | 'cloud'
  | 'facilities'
  | 'security'
  | 'construction'
  | 'supply'
  | 'property'
  | 'custom'

export type VendorStatus = 'active' | 'inactive' | 'terminated'
export type VendorSubmissionMethod = 'excel' | 'webform' | 'both' | 'manual'

// ─── Feature flags ───────────────────────────────────────────────────────────

export type FeatureFlags = {
  aiChat: boolean
  whiteLabelReports: boolean
  vendorForms: boolean
  allCadences: boolean
  customKpiTemplates: boolean
  apiAccess: boolean
  ssoSaml: boolean
  unlimitedVendors: boolean
  unlimitedSeats: boolean
  reportScheduling: boolean
}

export function getFeatureFlags(plan: OrgPlan): FeatureFlags {
  return {
    aiChat: plan !== 'starter',
    whiteLabelReports: plan === 'professional' || plan === 'enterprise',
    vendorForms: plan !== 'starter',
    allCadences: plan !== 'starter',
    customKpiTemplates: plan === 'enterprise',
    apiAccess: plan === 'enterprise',
    ssoSaml: plan === 'enterprise',
    unlimitedVendors: plan === 'enterprise',
    unlimitedSeats: plan === 'enterprise',
    reportScheduling: plan !== 'starter',
  }
}

// ─── Plan limits ─────────────────────────────────────────────────────────────
// Single source of truth for what each plan allows. Keeps storage and AI costs
// bounded: the free tier is small AND time-limited; Pro has generous-but-capped
// usage; Enterprise is unlimited (sales-managed).

export type PlanLimits = {
  vendors: number
  contracts: number
  seats: number
  /** Max size of a single uploaded document, in MB */
  maxFileMb: number
  /** Total document storage across the org, in MB */
  storageMb: number
  /** Free tier only: months after org creation before the tier expires */
  expiryMonths: number | null
}

export const PLAN_LIMITS: Record<OrgPlan, PlanLimits> = {
  starter: {
    vendors: 2,
    contracts: 3,
    seats: 2,
    maxFileMb: 10,
    storageMb: 100,
    expiryMonths: 3,
  },
  professional: {
    vendors: 25,
    contracts: 100,
    seats: 10,
    maxFileMb: 25,
    storageMb: 5_000,
    expiryMonths: null,
  },
  enterprise: {
    vendors: Infinity,
    contracts: Infinity,
    seats: Infinity,
    maxFileMb: 50,
    storageMb: Infinity,
    expiryMonths: null,
  },
}

// Back-compat aliases (existing imports)
export const VENDOR_LIMITS: Record<OrgPlan, number> = {
  starter: PLAN_LIMITS.starter.vendors,
  professional: PLAN_LIMITS.professional.vendors,
  enterprise: PLAN_LIMITS.enterprise.vendors,
}

export const SEAT_LIMITS: Record<OrgPlan, number> = {
  starter: PLAN_LIMITS.starter.seats,
  professional: PLAN_LIMITS.professional.seats,
  enterprise: PLAN_LIMITS.enterprise.seats,
}

// ─── API error shape ─────────────────────────────────────────────────────────

export type ApiError = {
  error: string
  code: string
  details?: Record<string, unknown>
}

// ─── Auth session user ───────────────────────────────────────────────────────

export type SessionUser = {
  id: string
  email: string
  orgId: string
  role: UserRole
  fullName: string | null
}
