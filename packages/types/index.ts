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

export const VENDOR_LIMITS: Record<OrgPlan, number> = {
  starter: 3,
  professional: 10,
  enterprise: Infinity,
}

export const SEAT_LIMITS: Record<OrgPlan, number> = {
  starter: 2,
  professional: 5,
  enterprise: Infinity,
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
