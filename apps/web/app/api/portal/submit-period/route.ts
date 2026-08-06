export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@contractly/db'
import { portalTokens, submissionPeriods, kpiResults, contracts, vendors } from '@contractly/db/schema'
import { eq, and, count, sql } from '@contractly/db'
import { createServiceClient } from '@/lib/supabase/server'
import { sendSubmissionNotification } from '@/lib/email'

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { token } = body

  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const [pt] = await db
    .select()
    .from(portalTokens)
    .where(eq(portalTokens.token, token))
    .limit(1)

  if (!pt) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
  if (new Date(pt.expiresAt) < new Date()) {
    return NextResponse.json({ error: 'This link has expired' }, { status: 401 })
  }

  // Only allow submitting an open period
  const [period] = await db
    .select()
    .from(submissionPeriods)
    .where(eq(submissionPeriods.id, pt.periodId))
    .limit(1)

  if (!period) return NextResponse.json({ error: 'Period not found' }, { status: 404 })
  if (period.status === 'locked') {
    return NextResponse.json({ error: 'This period has already been locked' }, { status: 400 })
  }
  if (period.status === 'submitted') {
    return NextResponse.json({ success: true }) // idempotent
  }

  await db
    .update(submissionPeriods)
    .set({ status: 'submitted', updatedAt: new Date() })
    .where(eq(submissionPeriods.id, pt.periodId))

  // Fire notification email to org managers — best-effort, don't fail the request
  try {
    const [contract] = await db
      .select({ name: contracts.name, vendorId: contracts.vendorId })
      .from(contracts)
      .where(eq(contracts.id, pt.contractId))
      .limit(1)

    const [vendor] = contract
      ? await db.select({ name: vendors.name }).from(vendors).where(eq(vendors.id, contract.vendorId)).limit(1)
      : [null]

    const [counts] = await db
      .select({
        total: count(),
        entered: sql<number>`count(case when ${kpiResults.actualValue} is not null or ${kpiResults.exemptionClaimed} = true then 1 end)`,
        breaches: sql<number>`count(case when ${kpiResults.resultStatus} = 'breach' then 1 end)`,
        exemptions: sql<number>`count(case when ${kpiResults.exemptionClaimed} = true and ${kpiResults.exemptionStatus} = 'pending' then 1 end)`,
      })
      .from(kpiResults)
      .where(and(eq(kpiResults.periodId, pt.periodId), eq(kpiResults.contractId, pt.contractId)))

    // Get org user emails via Supabase admin
    const supabaseAdmin = createServiceClient()
    // List all auth users — filter by org via our users table
    const { data: orgUsers } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('org_id', pt.orgId)
      .in('role', ['admin', 'manager'])

    const periodLabel = `${fmtDate(period.periodStart)} – ${fmtDate(period.periodEnd)}`
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    // Construct deep link — we don't have vendorId here but can use contract page
    const resultsUrl = `${appUrl}/vendors`

    if (orgUsers && orgUsers.length > 0) {
      const userIds = orgUsers.map((u: { id: string }) => u.id)
      // Fetch emails from auth.users via admin API
      for (const uid of userIds) {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(uid)
        if (authUser?.user?.email) {
          await sendSubmissionNotification({
            to: authUser.user.email,
            vendorName: vendor?.name ?? 'Vendor',
            contractName: contract?.name ?? 'contract',
            periodLabel,
            breaches: Number(counts?.breaches ?? 0),
            exemptions: Number(counts?.exemptions ?? 0),
            total: Number(counts?.total ?? 0),
            entered: Number(counts?.entered ?? 0),
            resultsUrl,
          })
        }
      }
    }
  } catch (err) {
    // Non-fatal — log but don't block the response
    console.error('[portal/submit-period] notification error:', err)
  }

  return NextResponse.json({ success: true })
}
