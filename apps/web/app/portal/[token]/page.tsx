export const dynamic = 'force-dynamic'

import { db } from '@contractly/db'
import { portalTokens, submissionPeriods, kpiResults, kpis, contracts, vendors } from '@contractly/db/schema'
import { eq, asc } from '@contractly/db'
import { PortalForm } from './PortalForm'

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

export default async function PortalPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  // Look up token
  const [pt] = await db
    .select()
    .from(portalTokens)
    .where(eq(portalTokens.token, token))
    .limit(1)

  if (!pt) {
    return <InvalidToken message="This link is invalid or has already been used." />
  }

  if (new Date(pt.expiresAt) < new Date()) {
    return <InvalidToken message="This link has expired. Please contact your contract manager for a new link." />
  }

  // Mark first open
  if (!pt.openedAt) {
    await db.update(portalTokens).set({ openedAt: new Date() }).where(eq(portalTokens.id, pt.id))
  }

  // Fetch period
  const [period] = await db
    .select()
    .from(submissionPeriods)
    .where(eq(submissionPeriods.id, pt.periodId))
    .limit(1)

  if (!period) return <InvalidToken message="Submission period not found." />

  if (period.status === 'locked') {
    return (
      <div className="text-center py-16 space-y-3">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
          <span className="text-2xl">🔒</span>
        </div>
        <h2 className="text-[17px] font-semibold text-ink">Period locked</h2>
        <p className="text-[13px] text-muted max-w-sm mx-auto">
          This submission period has been locked by your contract manager. No further changes can be made.
        </p>
      </div>
    )
  }

  // Fetch contract + vendor
  const [contract] = await db.select().from(contracts).where(eq(contracts.id, pt.contractId)).limit(1)
  const [vendor] = contract
    ? await db.select().from(vendors).where(eq(vendors.id, contract.vendorId)).limit(1)
    : [null]

  // Fetch KPI results with KPI data
  const rows = await db
    .select({ result: kpiResults, kpi: kpis })
    .from(kpiResults)
    .innerJoin(kpis, eq(kpiResults.kpiId, kpis.id))
    .where(eq(kpiResults.periodId, pt.periodId))
    .orderBy(asc(kpis.name))

  const periodLabel = `${fmtDate(period.periodStart)} – ${fmtDate(period.periodEnd)}`
  const dueLabel = fmtDate(period.dueDate)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-eyebrow text-muted mb-1">
              {vendor?.name ?? 'Vendor'} · {contract?.name ?? 'Contract'}
            </p>
            <h1 className="text-[22px] font-serif font-normal text-ink leading-tight">
              KPI Submission
            </h1>
            <p className="text-[13px] text-muted mt-1.5">{periodLabel}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[11px] font-bold uppercase tracking-eyebrow text-muted">Due date</p>
            <p className="text-[15px] font-semibold text-ink mt-0.5">{dueLabel}</p>
          </div>
        </div>

        <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <p className="text-[12.5px] text-primary">
            Please enter the actual value for each KPI below. For KPIs you cannot meet due to reasons outside your control, tick "Claim exemption" and provide a reason — these will be reviewed by your contract manager.
          </p>
        </div>
      </div>

      {/* Form */}
      <PortalForm
        token={token}
        periodId={period.id}
        periodStatus={period.status}
        rows={rows.map(r => ({
          result: {
            id: r.result.id,
            actualValue: r.result.actualValue,
            comment: r.result.comment,
            exemptionClaimed: r.result.exemptionClaimed,
            exemptionReason: r.result.exemptionReason,
            resultStatus: r.result.resultStatus,
          },
          kpi: {
            id: r.kpi.id,
            name: r.kpi.name,
            kpiType: r.kpi.kpiType,
            targetValue: r.kpi.targetValue,
            targetOperator: r.kpi.targetOperator,
            targetValueMax: r.kpi.targetValueMax,
            unitLabel: r.kpi.unitLabel,
            cadence: r.kpi.cadence,
            resultType: r.kpi.resultType,
          },
        }))}
      />
    </div>
  )
}

function InvalidToken({ message }: { message: string }) {
  return (
    <div className="text-center py-20 space-y-3">
      <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mx-auto">
        <span className="text-2xl">⚠️</span>
      </div>
      <h2 className="text-[17px] font-semibold text-ink">Link unavailable</h2>
      <p className="text-[13px] text-muted max-w-sm mx-auto">{message}</p>
    </div>
  )
}
