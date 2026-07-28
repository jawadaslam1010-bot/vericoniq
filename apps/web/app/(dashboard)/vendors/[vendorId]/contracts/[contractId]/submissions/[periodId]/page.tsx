export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { db } from '@contractly/db'
import { users, contracts, submissionPeriods, kpiResults, kpis } from '@contractly/db/schema'
import { eq, and, asc } from '@contractly/db'
import { ResultsEntryClient } from '@/components/submissions/ResultsEntryClient'
import { PortalLinksPanel } from '@/components/submissions/PortalLinksPanel'

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function PeriodResultsPage({
  params,
}: {
  params: Promise<{ vendorId: string; contractId: string; periodId: string }>
}) {
  const { vendorId, contractId, periodId } = await params

  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const [userRecord] = await db.select().from(users).where(eq(users.id, authUser.id)).limit(1)
  if (!userRecord) redirect('/login')

  const [contract] = await db
    .select()
    .from(contracts)
    .where(and(eq(contracts.id, contractId), eq(contracts.orgId, userRecord.orgId)))
    .limit(1)
  if (!contract) notFound()

  const [period] = await db
    .select()
    .from(submissionPeriods)
    .where(and(
      eq(submissionPeriods.id, periodId),
      eq(submissionPeriods.orgId, userRecord.orgId)
    ))
    .limit(1)
  if (!period) notFound()

  // Fetch all results with their KPI data
  const rows = await db
    .select({
      result: kpiResults,
      kpi: kpis,
    })
    .from(kpiResults)
    .innerJoin(kpis, eq(kpiResults.kpiId, kpis.id))
    .where(eq(kpiResults.periodId, periodId))
    .orderBy(asc(kpis.kpiType), asc(kpis.name))

  const periodLabel = `${fmtDate(period.periodStart)} – ${fmtDate(period.periodEnd)}`

  return (
    <div className="space-y-5">
      <ResultsEntryClient
        contract={{ id: contract.id, name: contract.name }}
        period={{ ...period, label: periodLabel }}
        rows={rows}
        vendorId={vendorId}
      />
      <PortalLinksPanel
        periodId={periodId}
        appUrl={process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}
      />
    </div>
  )
}
