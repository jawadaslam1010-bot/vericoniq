import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { db } from '@contractly/db'
import { vendors, users } from '@contractly/db/schema'
import { contracts } from '@contractly/db/schema'
import { eq, and, isNull, desc } from '@contractly/db'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { FileText, Plus, ChevronRight, Calendar, DollarSign, Cpu } from 'lucide-react'
import { formatDate } from '@/lib/utils'

const STATUS_BADGE: Record<
  string,
  { label: string; className: string }
> = {
  active: { label: 'Active', className: 'bg-green-100 text-green-800' },
  expired: { label: 'Expired', className: 'bg-slate-100 text-slate-600' },
  terminated: { label: 'Terminated', className: 'bg-red-100 text-red-700' },
  draft: { label: 'Draft', className: 'bg-yellow-100 text-yellow-800' },
}

const EXTRACTION_BADGE: Record<
  string,
  { label: string; className: string }
> = {
  pending: { label: 'Pending', className: 'bg-slate-100 text-slate-600' },
  processing: {
    label: 'Processing',
    className: 'bg-amber-100 text-amber-800 animate-pulse',
  },
  complete: { label: 'Complete', className: 'bg-green-100 text-green-800' },
  failed: { label: 'Failed', className: 'bg-red-100 text-red-700' },
}

function formatCurrency(value: string | null, currency: string): string | null {
  if (!value) return null
  const num = parseFloat(value)
  if (isNaN(num)) return null
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: currency ?? 'AUD',
    maximumFractionDigits: 0,
  }).format(num)
}

export default async function VendorContractsPage({
  params,
}: {
  params: Promise<{ vendorId: string }>
}) {
  const { vendorId } = await params
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

  const [vendor] = await db
    .select()
    .from(vendors)
    .where(
      and(
        eq(vendors.id, vendorId),
        eq(vendors.orgId, userRecord.orgId),
        isNull(vendors.deletedAt)
      )
    )
    .limit(1)

  if (!vendor) notFound()

  const contractList = await db
    .select()
    .from(contracts)
    .where(and(eq(contracts.vendorId, vendorId), eq(contracts.orgId, userRecord.orgId)))
    .orderBy(desc(contracts.createdAt))

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-slate-500">
        <Link href="/vendors" className="hover:text-slate-900">
          Vendors
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link href={`/vendors/${vendorId}`} className="hover:text-slate-900">
          {vendor.name}
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-slate-900 font-medium">Contracts</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Contracts</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage contracts and run AI extraction
          </p>
        </div>
        <Link href={`/vendors/${vendorId}/contracts/new`}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add contract
          </Button>
        </Link>
      </div>

      {/* Contract list */}
      {contractList.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 py-16 text-center">
          <div className="mb-4 rounded-full bg-slate-100 p-4">
            <FileText className="h-8 w-8 text-slate-400" />
          </div>
          <p className="text-base font-medium text-slate-700">No contracts yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Upload your first contract to get started with AI extraction.
          </p>
          <Link href={`/vendors/${vendorId}/contracts/new`} className="mt-6">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add your first contract
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {contractList.map((contract) => {
            const statusBadge =
              STATUS_BADGE[contract.status] ?? STATUS_BADGE['draft']
            const extractionBadge =
              EXTRACTION_BADGE[contract.extractionStatus] ??
              EXTRACTION_BADGE['pending']

            const annualDisplay = formatCurrency(
              contract.annualValue,
              contract.currency
            )
            const monthlyDisplay = formatCurrency(
              contract.monthlyValue,
              contract.currency
            )

            return (
              <Link
                key={contract.id}
                href={`/vendors/${vendorId}/contracts/${contract.id}`}
              >
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="py-4 px-5">
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: icon + name */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="shrink-0 rounded-lg bg-slate-100 p-2">
                          <FileText className="h-5 w-5 text-slate-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">
                            {contract.name}
                          </p>
                          {contract.contractNumber && (
                            <p className="text-xs text-slate-400 mt-0.5">
                              #{contract.contractNumber}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right: badges */}
                      <div className="flex shrink-0 items-center gap-2 flex-wrap justify-end">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge.className}`}
                        >
                          {statusBadge.label}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${extractionBadge.className}`}
                        >
                          <Cpu className="h-3 w-3" />
                          {extractionBadge.label}
                        </span>
                      </div>
                    </div>

                    {/* Meta row */}
                    <div className="mt-3 flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                      {(contract.startDate || contract.endDate) && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {contract.startDate
                            ? formatDate(contract.startDate)
                            : '—'}
                          {' → '}
                          {contract.endDate
                            ? formatDate(contract.endDate)
                            : 'ongoing'}
                        </span>
                      )}
                      {annualDisplay && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3.5 w-3.5" />
                          {annualDisplay}
                          <span className="text-slate-400">/yr</span>
                        </span>
                      )}
                      {!annualDisplay && monthlyDisplay && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3.5 w-3.5" />
                          {monthlyDisplay}
                          <span className="text-slate-400">/mo</span>
                        </span>
                      )}
                      <span className="ml-auto text-slate-400">
                        Added {formatDate(contract.createdAt)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
