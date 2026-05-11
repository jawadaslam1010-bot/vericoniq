import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { db } from '@contractly/db'
import { users, contracts, vendors, kpis, contractDocuments } from '@contractly/db/schema'
import { eq, and, count, desc, isNull } from '@contractly/db'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  FileText,
  Building2,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  Plus,
  Calendar,
  TrendingUp,
} from 'lucide-react'

function extractionBadge(status: string) {
  switch (status) {
    case 'complete':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
          <CheckCircle className="h-3 w-3" />
          Extracted
        </span>
      )
    case 'processing':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
          <Loader2 className="h-3 w-3 animate-spin" />
          Processing
        </span>
      )
    case 'failed':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
          <AlertCircle className="h-3 w-3" />
          Failed
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
          <Clock className="h-3 w-3" />
          Pending
        </span>
      )
  }
}

function statusBadge(status: string) {
  switch (status) {
    case 'active':
      return <Badge variant="default" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0">Active</Badge>
    case 'expired':
      return <Badge variant="secondary" className="bg-red-100 text-red-700 hover:bg-red-100 border-0">Expired</Badge>
    case 'terminated':
      return <Badge variant="secondary" className="bg-gray-100 text-gray-600 hover:bg-gray-100 border-0">Terminated</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

function formatDate(date: string | null) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatCurrency(value: string | null, currency = 'AUD') {
  if (!value) return null
  const num = parseFloat(value)
  if (isNaN(num)) return null
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency, maximumFractionDigits: 0 }).format(num)
}

export default async function ContractsPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const [userRecord] = await db
    .select()
    .from(users)
    .where(eq(users.id, authUser.id))
    .limit(1)

  if (!userRecord) redirect('/login?error=no_profile')

  // Fetch all contracts with vendor name + KPI count + doc count
  const rows = await db
    .select({
      contract: contracts,
      vendorName: vendors.name,
      vendorId: vendors.id,
      kpiCount: count(kpis.id),
    })
    .from(contracts)
    .leftJoin(vendors, eq(contracts.vendorId, vendors.id))
    .leftJoin(kpis, and(eq(kpis.contractId, contracts.id), eq(kpis.isActive, true)))
    .where(eq(contracts.orgId, userRecord.orgId))
    .groupBy(contracts.id, vendors.name, vendors.id)
    .orderBy(desc(contracts.createdAt))

  // Fetch active vendors for the "new contract" dropdown hint
  const activeVendors = await db
    .select({ id: vendors.id, name: vendors.name })
    .from(vendors)
    .where(and(eq(vendors.orgId, userRecord.orgId), isNull(vendors.deletedAt)))
    .orderBy(vendors.name)

  const totalActive = rows.filter(r => r.contract.status === 'active').length
  const totalExtracted = rows.filter(r => r.contract.extractionStatus === 'complete').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Contracts</h1>
          <p className="mt-1 text-sm text-slate-500">
            All contracts across your vendor portfolio
          </p>
        </div>
        {activeVendors.length > 0 && (
          <Link href={`/vendors/${activeVendors[0].id}/contracts/new`}>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              New Contract
            </Button>
          </Link>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Total</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{rows.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Active</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{totalActive}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">AI Extracted</p>
          <p className="mt-1 text-2xl font-bold text-blue-600">{totalExtracted}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Vendors</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{activeVendors.length}</p>
        </div>
      </div>

      {/* Contracts list */}
      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center">
          <FileText className="mx-auto h-10 w-10 text-slate-300" />
          <h3 className="mt-3 text-sm font-medium text-slate-700">No contracts yet</h3>
          <p className="mt-1 text-sm text-slate-500">
            Go to a vendor and create your first contract.
          </p>
          {activeVendors.length > 0 && (
            <Link href={`/vendors/${activeVendors[0].id}/contracts/new`}>
              <Button size="sm" className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                New Contract
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Contract</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Vendor</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Value</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">End Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">AI Extraction</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">KPIs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(({ contract, vendorName, vendorId, kpiCount }) => (
                <tr
                  key={contract.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/vendors/${vendorId}/contracts/${contract.id}`}
                      className="font-medium text-slate-900 hover:text-blue-600 transition-colors"
                    >
                      {contract.name}
                    </Link>
                    {contract.contractNumber && (
                      <p className="text-xs text-slate-400 mt-0.5">{contract.contractNumber}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/vendors/${vendorId}`}
                      className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate max-w-[140px]">{vendorName ?? '—'}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {statusBadge(contract.status)}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-slate-600">
                    {formatCurrency(contract.annualValue, contract.currency) ??
                     formatCurrency(contract.monthlyValue ? String(parseFloat(contract.monthlyValue) * 12) : null, contract.currency) ??
                     <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      {formatDate(contract.endDate)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {extractionBadge(contract.extractionStatus)}
                  </td>
                  <td className="px-4 py-3 text-right hidden sm:table-cell">
                    {contract.extractionStatus === 'complete' ? (
                      <Link
                        href={`/vendors/${vendorId}/contracts/${contract.id}/kpis`}
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium transition-colors"
                      >
                        <TrendingUp className="h-3.5 w-3.5" />
                        {kpiCount}
                      </Link>
                    ) : (
                      <span className="text-slate-400">{kpiCount > 0 ? kpiCount : '—'}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
