/**
 * Plan-limit enforcement. Pure decision functions live here (unit-testable);
 * the assert* helpers fetch usage and throw TRPCError for router use.
 */
import { TRPCError } from '@trpc/server'
import { db } from '@contractly/db'
import { organisations, vendors, contracts, contractDocuments } from '@contractly/db/schema'
import { eq, and, isNull, sql } from '@contractly/db'
import { PLAN_LIMITS, type OrgPlan, type PlanLimits } from '@contractly/types'

export type OrgBilling = {
  plan: OrgPlan
  subscriptionStatus: string | null
  trialEndsAt: Date | null
}

export function planLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[(plan as OrgPlan) in PLAN_LIMITS ? (plan as OrgPlan) : 'starter']
}

/** Has the free tier's 3-month clock run out? Paid plans never expire here. */
export function isFreeTierExpired(org: OrgBilling, now: Date = new Date()): boolean {
  if (org.plan !== 'starter') return false
  if (!org.trialEndsAt) return false
  return now > org.trialEndsAt
}

export type LimitCheck =
  | { ok: true }
  | { ok: false; reason: 'expired' | 'limit'; message: string }

export function checkCreateAllowed(opts: {
  org: OrgBilling
  kind: 'vendor' | 'contract'
  currentCount: number
  now?: Date
}): LimitCheck {
  const { org, kind, currentCount } = opts
  if (isFreeTierExpired(org, opts.now)) {
    return {
      ok: false,
      reason: 'expired',
      message: 'Your free tier has ended. Upgrade to Pro to keep adding to your portfolio — existing data stays readable.',
    }
  }
  const limits = planLimits(org.plan)
  const max = kind === 'vendor' ? limits.vendors : limits.contracts
  if (max !== Infinity && currentCount >= max) {
    return {
      ok: false,
      reason: 'limit',
      message: `Your ${org.plan} plan allows up to ${max} ${kind}s. Upgrade to add more.`,
    }
  }
  return { ok: true }
}

export function checkUploadAllowed(opts: {
  org: OrgBilling
  fileSizeBytes: number
  currentStorageBytes: number
  now?: Date
}): LimitCheck {
  const { org, fileSizeBytes, currentStorageBytes } = opts
  if (isFreeTierExpired(org, opts.now)) {
    return {
      ok: false,
      reason: 'expired',
      message: 'Your free tier has ended. Upgrade to Pro to upload documents.',
    }
  }
  const limits = planLimits(org.plan)
  const mb = 1024 * 1024
  if (fileSizeBytes > limits.maxFileMb * mb) {
    return {
      ok: false,
      reason: 'limit',
      message: `Files on the ${org.plan} plan are limited to ${limits.maxFileMb} MB each.`,
    }
  }
  if (limits.storageMb !== Infinity && currentStorageBytes + fileSizeBytes > limits.storageMb * mb) {
    return {
      ok: false,
      reason: 'limit',
      message: `This upload would exceed your plan's ${limits.storageMb >= 1000 ? `${limits.storageMb / 1000} GB` : `${limits.storageMb} MB`} storage limit. Upgrade or remove old documents.`,
    }
  }
  return { ok: true }
}

// ─── DB-backed helpers for routers ───────────────────────────────────────────

export async function getOrgBilling(orgId: string): Promise<OrgBilling> {
  const [org] = await db
    .select({
      plan: organisations.plan,
      subscriptionStatus: organisations.subscriptionStatus,
      trialEndsAt: organisations.trialEndsAt,
    })
    .from(organisations)
    .where(eq(organisations.id, orgId))
    .limit(1)
  if (!org) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Organisation not found' })
  return { ...org, plan: org.plan as OrgPlan }
}

export async function getOrgUsage(orgId: string) {
  const [vendorRows, contractRows, storage] = await Promise.all([
    db.select({ id: vendors.id }).from(vendors).where(and(eq(vendors.orgId, orgId), isNull(vendors.deletedAt))),
    db.select({ id: contracts.id }).from(contracts).where(eq(contracts.orgId, orgId)),
    db
      .select({ total: sql<number>`coalesce(sum(${contractDocuments.fileSizeBytes}), 0)` })
      .from(contractDocuments)
      .where(eq(contractDocuments.orgId, orgId)),
  ])
  return {
    vendors: vendorRows.length,
    contracts: contractRows.length,
    storageBytes: Number(storage[0]?.total ?? 0),
  }
}

function throwLimit(check: LimitCheck): asserts check is { ok: true } {
  if (!check.ok) throw new TRPCError({ code: 'FORBIDDEN', message: check.message })
}

export async function assertCanCreate(orgId: string, kind: 'vendor' | 'contract') {
  const [org, usage] = await Promise.all([getOrgBilling(orgId), getOrgUsage(orgId)])
  throwLimit(checkCreateAllowed({
    org,
    kind,
    currentCount: kind === 'vendor' ? usage.vendors : usage.contracts,
  }))
}

export async function assertCanUpload(orgId: string, fileSizeBytes: number) {
  const [org, usage] = await Promise.all([getOrgBilling(orgId), getOrgUsage(orgId)])
  throwLimit(checkUploadAllowed({ org, fileSizeBytes, currentStorageBytes: usage.storageBytes }))
}
