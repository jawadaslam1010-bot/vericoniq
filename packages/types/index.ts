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

export type OrgPlan = 'starter' | 'essentials' | 'professional' | 'enterprise'
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
  const paid = plan !== 'starter'
  const proUp = plan === 'professional' || plan === 'enterprise'
  return {
    aiChat: paid,
    whiteLabelReports: proUp,
    vendorForms: paid,
    allCadences: paid,
    customKpiTemplates: plan === 'enterprise',
    apiAccess: plan === 'enterprise',
    ssoSaml: plan === 'enterprise',
    unlimitedVendors: plan === 'enterprise',
    unlimitedSeats: plan === 'enterprise',
    reportScheduling: paid,
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
  essentials: {
    vendors: 5,
    contracts: 15,
    seats: 3,
    maxFileMb: 10,
    storageMb: 500,
    expiryMonths: null,
  },
  professional: {
    vendors: 25,
    contracts: 100,
    seats: 10,
    maxFileMb: 25,
    storageMb: 2_000,
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

// ─── Plan feature gates ──────────────────────────────────────────────────────
// The "money features" that differentiate Professional from Essentials.
// Starter (free trial) gets everything within its tiny limits so evaluators
// see the full product; Essentials trades those features for the low price.

export type PlanFeature = 'vendorPortal' | 'creditRecovery'

export function planHasFeature(plan: OrgPlan | string, feature: PlanFeature): boolean {
  switch (feature) {
    case 'vendorPortal':
    case 'creditRecovery':
      return plan === 'starter' || plan === 'professional' || plan === 'enterprise'
    default:
      return false
  }
}

// Back-compat aliases (existing imports)
export const VENDOR_LIMITS: Record<OrgPlan, number> = {
  starter: PLAN_LIMITS.starter.vendors,
  essentials: PLAN_LIMITS.essentials.vendors,
  professional: PLAN_LIMITS.professional.vendors,
  enterprise: PLAN_LIMITS.enterprise.vendors,
}

export const SEAT_LIMITS: Record<OrgPlan, number> = {
  starter: PLAN_LIMITS.starter.seats,
  essentials: PLAN_LIMITS.essentials.seats,
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
