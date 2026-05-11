import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { db } from '@contractly/db'
import { users, vendors } from '@contractly/db/schema'
import { contracts, contractDocuments, kpis } from '@contractly/db/schema'
import { eq, and, asc, count } from '@contractly/db'
import { ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { DocumentUploadPanel } from '@/components/contracts/DocumentUploadPanel'
import { ExtractionTrigger } from '@/components/contracts/ExtractionTrigger'
import { DocumentList } from '@/components/contracts/DocumentList'

function formatCurrency(value: string | null, currency: string) {
  if (!value) return '—'
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency }).format(Number(value))
}


export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ vendorId: string; contractId: string }>
}) {
  const { vendorId, contractId } = await params

  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) redirect('/login')

  const [userRecord] = await db
    .select()
    .from(users)
    .where(eq(users.id, authUser.id))
    .limit(1)

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
    .where(eq(vendors.id, contract.vendorId))
    .limit(1)

  const documents = await db
    .select()
    .from(contractDocuments)
    .where(eq(contractDocuments.contractId, contractId))
    .orderBy(asc(contractDocuments.hierarchyOrder))

  const [{ value: kpiCount }] = await db
    .select({ value: count() })
    .from(kpis)
    .where(eq(kpis.contractId, contractId))

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-slate-500 mb-6">
        <Link href="/vendors" className="hover:text-slate-700 transition-colors">
          Vendors
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link
          href={`/vendors/${vendorId}`}
          className="hover:text-slate-700 transition-colors"
        >
          {vendor?.name ?? 'Unknown Vendor'}
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link
          href={`/vendors/${vendorId}/contracts`}
          className="hover:text-slate-700 transition-colors"
        >
          Contracts
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-slate-900 font-medium">{contract.name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{contract.name}</h1>
          {contract.contractNumber && (
            <p className="text-sm text-slate-500 mt-1">{contract.contractNumber}</p>
          )}
          <div className="mt-2">
            <Badge>{contract.status ?? 'draft'}</Badge>
          </div>
        </div>
        {contract.extractionStatus === 'complete' && (
          <Button asChild className="bg-green-600 hover:bg-green-700 text-white">
            <Link href={`/vendors/${vendorId}/contracts/${contractId}/kpis`}>
              View KPI Register
            </Link>
          </Button>
        )}
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column (lg:col-span-2) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Contract documents */}
          <Card>
            <CardHeader>
              <CardTitle>Contract documents</CardTitle>
              <CardDescription>Upload PDFs for AI extraction</CardDescription>
            </CardHeader>
            <CardContent>
              <DocumentList documents={documents} />
              <DocumentUploadPanel contractId={contractId} orgId={userRecord.orgId} />
            </CardContent>
          </Card>

          {/* Card 2: AI Extraction */}
          <Card>
            <CardContent className="pt-6">
              <ExtractionTrigger
                contractId={contractId}
                vendorId={vendorId}
                extractionStatus={contract.extractionStatus}
                kpiCount={Number(kpiCount)}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right column (lg:col-span-1) */}
        <div className="lg:col-span-1 space-y-6">
          {/* Card 3: Contract details */}
          <Card>
            <CardHeader>
              <CardTitle>Contract details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-y-4">
                <div>
                  <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Start date
                  </dt>
                  <dd className="mt-1 text-sm text-slate-900">
                    {contract.startDate ? formatDate(contract.startDate) : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    End date
                  </dt>
                  <dd className="mt-1 text-sm text-slate-900">
                    {contract.endDate ? formatDate(contract.endDate) : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Notice period
                  </dt>
                  <dd className="mt-1 text-sm text-slate-900">
                    {contract.noticePeriodDays != null
                      ? `${contract.noticePeriodDays} days`
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Auto-renewal
                  </dt>
                  <dd className="mt-1 text-sm text-slate-900">
                    {contract.autoRenewal
                      ? `Yes${contract.autoRenewalMonths != null ? ` - ${contract.autoRenewalMonths} months` : ''}`
                      : 'No'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Annual value
                  </dt>
                  <dd className="mt-1 text-sm text-slate-900">
                    {formatCurrency(contract.annualValue ?? null, contract.currency ?? 'AUD')}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Monthly value
                  </dt>
                  <dd className="mt-1 text-sm text-slate-900">
                    {formatCurrency(contract.monthlyValue ?? null, contract.currency ?? 'AUD')}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Perspective
                  </dt>
                  <dd className="mt-1 text-sm text-slate-900">
                    {contract.perspective === 'buyer'
                      ? 'Buyer'
                      : contract.perspective === 'vendor'
                      ? 'Vendor'
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Currency
                  </dt>
                  <dd className="mt-1 text-sm text-slate-900">
                    {contract.currency ?? '—'}
                  </dd>
                </div>
              </dl>

              {contract.aiExtractionNotes && contract.extractionStatus === 'complete' && (
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                    AI Notes
                  </h4>
                  <p className="text-sm italic text-slate-600">
                    {contract.aiExtractionNotes.length > 400
                      ? `${contract.aiExtractionNotes.slice(0, 400)}...`
                      : contract.aiExtractionNotes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
