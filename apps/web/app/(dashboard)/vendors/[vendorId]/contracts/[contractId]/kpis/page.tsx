export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { db } from '@contractly/db'
import { users, vendors } from '@contractly/db/schema'
import { contracts, kpis, contractKeyTerms } from '@contractly/db/schema'
import { eq, and, asc } from '@contractly/db'
import { KpiReviewClient, ConfirmKpisButton } from '@/components/contracts/KpiReviewClient'

export default async function KpisPage({
  params,
}: {
  params: Promise<{ vendorId: string; contractId: string }>
}) {
  const { vendorId, contractId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [userRecord] = await db.select().from(users).where(eq(users.id, user.id)).limit(1)
  if (!userRecord) redirect('/login')

  const [contract] = await db
    .select()
    .from(contracts)
    .where(and(eq(contracts.id, contractId), eq(contracts.orgId, userRecord.orgId)))
    .limit(1)
  if (!contract) notFound()

  const [vendor] = await db
    .select()
    .from(vendors)
    .where(and(eq(vendors.id, contract.vendorId), eq(vendors.orgId, userRecord.orgId)))
    .limit(1)
  if (!vendor) notFound()

  const kpiRows = await db
    .select()
    .from(kpis)
    .where(and(eq(kpis.contractId, contractId), eq(kpis.orgId, userRecord.orgId)))
    .orderBy(asc(kpis.kpiType), asc(kpis.name))

  const keyTermRows = await db
    .select()
    .from(contractKeyTerms)
    .where(and(eq(contractKeyTerms.contractId, contractId), eq(contractKeyTerms.orgId, userRecord.orgId)))

  const contractPath = `/vendors/${vendorId}/contracts/${contractId}`
  const isNotReady =
    contract.extractionStatus === 'pending' ||
    contract.extractionStatus === 'failed' ||
    contract.extractionStatus === 'processing'

  return (
    <div className="space-y-5">

      {/* Header row */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-[17px] font-semibold text-ink">KPI Register</h2>
          <p className="text-[12.5px] text-muted mt-0.5">
            {contract.name}
            {!isNotReady && ` · ${kpiRows.length} KPI${kpiRows.length !== 1 ? 's' : ''} · ${keyTermRows.length} key term${keyTermRows.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {kpiRows.length > 0 && <ConfirmKpisButton contractId={contractId} />}
      </div>

      {/* Not-ready states */}
      {isNotReady && (
        <div className="bg-surface border border-border rounded-lg p-6">
          {contract.extractionStatus === 'processing' && (
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-status-risk-dot mt-1.5 animate-pulse shrink-0" />
              <div>
                <p className="text-[13px] font-semibold text-ink">Extraction in progress</p>
                <p className="text-[12.5px] text-muted mt-1">
                  KPIs will appear here once complete. This typically takes 1–3 minutes.
                </p>
                <Link href={contractPath} className="inline-block mt-3 text-[12.5px] font-medium text-primary hover:underline">
                  ← Back to contract
                </Link>
              </div>
            </div>
          )}
          {contract.extractionStatus === 'pending' && (
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-faint mt-1.5 shrink-0" />
              <div>
                <p className="text-[13px] font-semibold text-ink">Extraction not yet run</p>
                <p className="text-[12.5px] text-muted mt-1">
                  Upload documents and run AI extraction from the contract page to populate this register.
                </p>
                <Link href={contractPath} className="inline-block mt-3 text-[12.5px] font-medium text-primary hover:underline">
                  ← Go to contract
                </Link>
              </div>
            </div>
          )}
          {contract.extractionStatus === 'failed' && (
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-status-breach-dot mt-1.5 shrink-0" />
              <div>
                <p className="text-[13px] font-semibold text-ink">Extraction failed</p>
                <p className="text-[12.5px] text-muted mt-1">
                  The extraction did not complete. Return to the contract page to retry.
                </p>
                <Link href={contractPath} className="inline-block mt-3 text-[12.5px] font-medium text-primary hover:underline">
                  ← Retry extraction
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main content */}
      {!isNotReady && (
        <KpiReviewClient
          kpis={kpiRows}
          keyTerms={keyTermRows}
          contractId={contractId}
        />
      )}
    </div>
  )
}
