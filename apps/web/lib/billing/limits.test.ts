import { describe, it, expect } from 'vitest'
import { checkCreateAllowed, checkUploadAllowed, isFreeTierExpired, planLimits } from './limits'
import { planFromSubscription } from './webhook-logic'

const MB = 1024 * 1024
const now = new Date('2026-07-29T00:00:00Z')
const future = new Date('2026-10-29T00:00:00Z')
const past = new Date('2026-06-01T00:00:00Z')

const freeOrg = { plan: 'starter' as const, subscriptionStatus: null, trialEndsAt: future }
const expiredOrg = { plan: 'starter' as const, subscriptionStatus: null, trialEndsAt: past }
const proOrg = { plan: 'professional' as const, subscriptionStatus: 'active', trialEndsAt: past }

describe('isFreeTierExpired', () => {
  it('is false while the clock is running', () => {
    expect(isFreeTierExpired(freeOrg, now)).toBe(false)
  })
  it('is true after trial end', () => {
    expect(isFreeTierExpired(expiredOrg, now)).toBe(true)
  })
  it('never expires paid plans, even with a past trialEndsAt', () => {
    expect(isFreeTierExpired(proOrg, now)).toBe(false)
  })
  it('is false when starter has no trialEndsAt set', () => {
    expect(isFreeTierExpired({ ...freeOrg, trialEndsAt: null }, now)).toBe(false)
  })
})

describe('checkCreateAllowed', () => {
  it('allows creation under the limit', () => {
    expect(checkCreateAllowed({ org: freeOrg, kind: 'vendor', currentCount: 1, now }).ok).toBe(true)
  })
  it('blocks at the free vendor limit (2)', () => {
    const r = checkCreateAllowed({ org: freeOrg, kind: 'vendor', currentCount: 2, now })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('limit')
  })
  it('blocks at the free contract limit (3)', () => {
    const r = checkCreateAllowed({ org: freeOrg, kind: 'contract', currentCount: 3, now })
    expect(r.ok).toBe(false)
  })
  it('blocks everything once the free tier has expired', () => {
    const r = checkCreateAllowed({ org: expiredOrg, kind: 'vendor', currentCount: 0, now })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('expired')
  })
  it('pro allows up to 25 vendors / 100 contracts', () => {
    expect(checkCreateAllowed({ org: proOrg, kind: 'vendor', currentCount: 24, now }).ok).toBe(true)
    expect(checkCreateAllowed({ org: proOrg, kind: 'vendor', currentCount: 25, now }).ok).toBe(false)
    expect(checkCreateAllowed({ org: proOrg, kind: 'contract', currentCount: 99, now }).ok).toBe(true)
    expect(checkCreateAllowed({ org: proOrg, kind: 'contract', currentCount: 100, now }).ok).toBe(false)
  })
  it('enterprise is unlimited', () => {
    const ent = { plan: 'enterprise' as const, subscriptionStatus: 'active', trialEndsAt: null }
    expect(checkCreateAllowed({ org: ent, kind: 'vendor', currentCount: 10_000, now }).ok).toBe(true)
  })
})

describe('checkUploadAllowed', () => {
  it('allows a normal upload', () => {
    expect(checkUploadAllowed({ org: freeOrg, fileSizeBytes: 5 * MB, currentStorageBytes: 0, now }).ok).toBe(true)
  })
  it('blocks a single file over the per-file cap (free: 10MB)', () => {
    const r = checkUploadAllowed({ org: freeOrg, fileSizeBytes: 11 * MB, currentStorageBytes: 0, now })
    expect(r.ok).toBe(false)
  })
  it('blocks when total storage would exceed the cap (free: 100MB)', () => {
    const r = checkUploadAllowed({ org: freeOrg, fileSizeBytes: 6 * MB, currentStorageBytes: 95 * MB, now })
    expect(r.ok).toBe(false)
  })
  it('blocks uploads after free-tier expiry', () => {
    const r = checkUploadAllowed({ org: expiredOrg, fileSizeBytes: 1 * MB, currentStorageBytes: 0, now })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('expired')
  })
  it('pro allows bigger files (25MB) and more storage (2GB)', () => {
    expect(checkUploadAllowed({ org: proOrg, fileSizeBytes: 20 * MB, currentStorageBytes: 1500 * MB, now }).ok).toBe(true)
    expect(checkUploadAllowed({ org: proOrg, fileSizeBytes: 30 * MB, currentStorageBytes: 0, now }).ok).toBe(false)
  })
})

describe('planFromSubscription', () => {
  it('active/trialing/past_due keep professional (default tier)', () => {
    for (const status of ['active', 'trialing', 'past_due']) {
      const r = planFromSubscription({ status, subscriptionId: 'sub_1' })
      expect(r.plan).toBe('professional')
      expect(r.stripeSubscriptionId).toBe('sub_1')
    }
  })
  it('maps the essentials tier from metadata', () => {
    const r = planFromSubscription({ status: 'active', subscriptionId: 'sub_1', tier: 'essentials' })
    expect(r.plan).toBe('essentials')
  })
  it('unknown tier metadata falls back to professional', () => {
    const r = planFromSubscription({ status: 'active', subscriptionId: 'sub_1', tier: 'bogus' })
    expect(r.plan).toBe('professional')
  })
  it('canceled/unpaid/incomplete_expired drop to starter and clear the sub id', () => {
    for (const status of ['canceled', 'unpaid', 'incomplete_expired', 'paused']) {
      const r = planFromSubscription({ status, subscriptionId: 'sub_1', tier: 'essentials' })
      expect(r.plan).toBe('starter')
      expect(r.stripeSubscriptionId).toBeNull()
    }
  })
})

describe('essentials tier', () => {
  const essOrg = { plan: 'essentials' as const, subscriptionStatus: 'active', trialEndsAt: null }
  it('never expires (paid plan)', () => {
    expect(isFreeTierExpired({ ...essOrg, trialEndsAt: past }, now)).toBe(false)
  })
  it('caps at 5 vendors / 15 contracts', () => {
    expect(checkCreateAllowed({ org: essOrg, kind: 'vendor', currentCount: 4, now }).ok).toBe(true)
    expect(checkCreateAllowed({ org: essOrg, kind: 'vendor', currentCount: 5, now }).ok).toBe(false)
    expect(checkCreateAllowed({ org: essOrg, kind: 'contract', currentCount: 14, now }).ok).toBe(true)
    expect(checkCreateAllowed({ org: essOrg, kind: 'contract', currentCount: 15, now }).ok).toBe(false)
  })
  it('caps storage at 500MB, files at 10MB', () => {
    expect(checkUploadAllowed({ org: essOrg, fileSizeBytes: 9 * MB, currentStorageBytes: 0, now }).ok).toBe(true)
    expect(checkUploadAllowed({ org: essOrg, fileSizeBytes: 11 * MB, currentStorageBytes: 0, now }).ok).toBe(false)
    expect(checkUploadAllowed({ org: essOrg, fileSizeBytes: 6 * MB, currentStorageBytes: 495 * MB, now }).ok).toBe(false)
  })
  it('pro storage is now capped at 2GB', () => {
    const pro = { plan: 'professional' as const, subscriptionStatus: 'active', trialEndsAt: null }
    expect(checkUploadAllowed({ org: pro, fileSizeBytes: 20 * MB, currentStorageBytes: 1900 * MB, now }).ok).toBe(true)
    expect(checkUploadAllowed({ org: pro, fileSizeBytes: 20 * MB, currentStorageBytes: 2000 * MB, now }).ok).toBe(false)
  })
})

describe('planHasFeature', () => {
  it('portal and credit recovery are Professional-and-above', async () => {
    const { planHasFeature } = await import('@contractly/types')
    for (const plan of ['starter', 'essentials']) {
      expect(planHasFeature(plan, 'vendorPortal')).toBe(false)
      expect(planHasFeature(plan, 'creditRecovery')).toBe(false)
    }
    for (const plan of ['professional', 'enterprise']) {
      expect(planHasFeature(plan, 'vendorPortal')).toBe(true)
      expect(planHasFeature(plan, 'creditRecovery')).toBe(true)
    }
  })

  it('alerts, reports and team invites are Essentials-and-above', async () => {
    const { planHasFeature } = await import('@contractly/types')
    for (const feature of ['renewalAlerts', 'reports', 'teamInvites'] as const) {
      expect(planHasFeature('starter', feature)).toBe(false)
      for (const plan of ['essentials', 'professional', 'enterprise']) {
        expect(planHasFeature(plan, feature)).toBe(true)
      }
    }
  })
})

describe('planLimits', () => {
  it('falls back to starter limits for unknown plan strings', () => {
    expect(planLimits('bogus').vendors).toBe(2)
  })
})
