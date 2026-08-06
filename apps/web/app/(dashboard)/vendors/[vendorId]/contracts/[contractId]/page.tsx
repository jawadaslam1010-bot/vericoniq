export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { db } from '@contractly/db'
import { users, vendors } from '@contractly/db/schema'
import { contracts, contractDocuments, kpis, contractKeyTerms } from '@contractly/db/schema'
import { eq, and, asc, count } from '@contractly/db'
import { DocumentUploadPanel } from '@/components/contracts/DocumentUploadPanel'
import { ExtractionTrigger } from '@/components/contracts/ExtractionTrigger'
import { DocumentList } from '@/components/contracts/DocumentList'
import { ContractDetailsPanel } from '@/components/contracts/ContractDetailsPanel'
import { AiNotes } from '@/components/contracts/AiNotes'
import { StatusBadge } from '@/components/ui/status-badge'

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ vendorId: string; contractId: string }>
}) {
  const { vendorId, contractId } = await params

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

  const documents = await db
    .select()
    .from(contractDocuments)
    .where(eq(contractDocuments.contractId, contractId))
    .orderBy(asc(contractDocuments.hierarchyOrder))

  const [{ value: kpiCount }] = await db
    .select({ value: count() })
    .from(kpis)
    .where(eq(kpis.contractId, contractId))

  const [{ value: termCount }] = await db
    .select({ value: count() })
    .from(contractKeyTerms)
    .where(eq(contractKeyTerms.contractId, contractId))

  const statusMap: Record<string, 'met' | 'stale' | 'breach' | 'risk'> = {
    active: 'met', expired: 'stale', terminated: 'breach', draft: 'risk',
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">

      {/* Left column */}
      <div className="space-y-5">

        {/* Documents card */}
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-border-soft">
            <h3 className="text-sm font-semibold text-ink">Contract documents</h3>
            <p className="text-[12.5px] text-muted mt-0.5">Upload PDFs or Word files — text is extracted automatically</p>
          </div>
          <div className="p-5 space-y-4">
            <DocumentList documents={documents} />
            <DocumentUploadPanel contractId={contractId} orgId={userRecord.orgId} />
          </div>
        </div>

        {/* AI extraction card */}
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-border-soft">
            <h3 className="text-sm font-semibold text-ink">AI extraction</h3>
            <p className="text-[12.5px] text-muted mt-0.5">
              {documents.length === 0
                ? 'Upload at least one document to enable extraction'
                : `${documents.length} document${documents.length !== 1 ? 's' : ''} ready · ${Number(kpiCount)} KPI${Number(kpiCount) !== 1 ? 's' : ''} extracted`}
            </p>
          </div>
          <div className="p-5">
            <ExtractionTrigger
              contractId={contractId}
              vendorId={vendorId}
              extractionStatus={contract.extractionStatus}
              kpiCount={Number(kpiCount)}
              termCount={Number(termCount)}
            />
          </div>
        </div>

        {/* AI notes */}
        {contract.extractionStatus === 'complete' && contract.aiExtractionNotes && (
          <AiNotes notes={contract.aiExtractionNotes} />
        )}
      </div>

      {/* Right column */}
      <div className="space-y-4">

        {/* Contract name + status header */}
        <div className="bg-surface border border-border rounded-lg p-5">
          <div className="flex items-start justify-between gap-2 mb-4">
            <div className="min-w-0">
              <h3 className="text-[13.5px] font-semibold text-ink leading-snug">{contract.name}</h3>
              {contract.contractNumber && (
                <p className="text-[11px] font-mono text-muted mt-0.5">{contract.contractNumber}</p>
              )}
            </div>
            <StatusBadge
              status={statusMap[contract.status] ?? 'stale'}
              label={contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
            />
          </div>

          {/* Unified details panel */}
          <ContractDetailsPanel
            hasDocuments={documents.length > 0}
            contract={{
              id: contractId,
              contractNumber: contract.contractNumber ?? null,
              startDate: contract.startDate ?? null,
              endDate: contract.endDate ?? null,
              noticePeriodDays: contract.noticePeriodDays ?? null,
              noticeDeadline: contract.noticeDeadline ?? null,
              autoRenewal: contract.autoRenewal,
              autoRenewalMonths: contract.autoRenewalMonths ?? null,
              annualValue: contract.annualValue ?? null,
              monthlyValue: contract.monthlyValue ?? null,
              currency: contract.currency ?? 'AUD',
              perspective: contract.perspective ?? 'buyer',
              extractionStatus: contract.extractionStatus,
            }}
          />
        </div>

        {/* KPI register link — shown after extraction */}
        {contract.extractionStatus === 'complete' && (
          <div className="space-y-2">
            <Link
              href={`/vendors/${vendorId}/contracts/${contractId}/kpis`}
              className="flex items-center justify-between gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg hover:bg-primary/10 transition-colors"
            >
              <div>
                <div className="text-[13px] font-semibold text-primary">KPI Register</div>
                <div className="text-[11.5px] text-primary/70 mt-0.5">
                  {Number(kpiCount)} KPI{Number(kpiCount) !== 1 ? 's' : ''} · review &amp; activate
                </div>
              </div>
              <svg className="h-4 w-4 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href={`/vendors/${vendorId}/contracts/${contractId}/submissions`}
              className="flex items-center justify-between gap-3 p-4 bg-surface border border-border rounded-lg hover:bg-hover transition-colors"
            >
              <div>
                <div className="text-[13px] font-semibold text-ink">Submissions</div>
                <div className="text-[11.5px] text-muted mt-0.5">Enter KPI results by period</div>
              </div>
              <svg className="h-4 w-4 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
