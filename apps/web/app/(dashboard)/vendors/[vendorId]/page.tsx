import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { db } from '@contractly/db'
import { vendors, users } from '@contractly/db/schema'
import { eq, and, isNull } from '@contractly/db'
import { ChevronRight, FileText, BarChart2, Calendar, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import type { Metadata } from 'next'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ vendorId: string }>
}): Promise<Metadata> {
  const { vendorId } = await params
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()
  if (!authUser) return { title: 'Vendor' }

  const [userRecord] = await db.select().from(users).where(eq(users.id, authUser.id)).limit(1)
  if (!userRecord) return { title: 'Vendor' }

  const [vendor] = await db
    .select()
    .from(vendors)
    .where(
      and(eq(vendors.id, vendorId), eq(vendors.orgId, userRecord.orgId), isNull(vendors.deletedAt))
    )
    .limit(1)

  return { title: vendor?.name ?? 'Vendor' }
}

const SERVICE_TYPE_LABELS: Record<string, string> = {
  telco: 'Telecommunications',
  it: 'IT Services',
  cloud: 'Cloud Services',
  facilities: 'Facilities Management',
  security: 'Security',
  construction: 'Construction',
  supply: 'Supply Chain',
  property: 'Property',
  custom: 'Other',
}

const NAV_ITEMS = [
  { label: 'Contracts', href: 'contracts', icon: FileText, description: 'Upload and manage contracts' },
  { label: 'KPI register', href: 'kpis', icon: BarChart2, description: 'Performance indicators' },
  { label: 'Scorecard', href: 'scorecard', icon: BarChart2, description: 'SLA performance' },
  { label: 'Submissions', href: 'submissions', icon: Calendar, description: 'Submission history' },
  { label: 'Breaches', href: 'breaches', icon: AlertTriangle, description: 'Active breaches' },
]

export default async function VendorDetailPage({
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
      and(eq(vendors.id, vendorId), eq(vendors.orgId, userRecord.orgId), isNull(vendors.deletedAt))
    )
    .limit(1)

  if (!vendor) notFound()

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-slate-500">
        <Link href="/vendors" className="hover:text-slate-900">
          Vendors
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-slate-900 font-medium">{vendor.name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
            <span className="text-lg font-semibold text-slate-600">
              {vendor.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{vendor.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-slate-500">
                {SERVICE_TYPE_LABELS[vendor.serviceType] ?? vendor.serviceType}
              </span>
              {vendor.abn && (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="text-sm text-slate-500">ABN {vendor.abn}</span>
                </>
              )}
              <Badge
                variant={
                  vendor.status === 'active'
                    ? 'default'
                    : vendor.status === 'inactive'
                      ? 'secondary'
                      : 'destructive'
                }
                className="capitalize"
              >
                {vendor.status}
              </Badge>
            </div>
          </div>
        </div>
        <Link href={`/vendors/${vendorId}/contracts`}>
          <Button>
            <FileText className="mr-2 h-4 w-4" />
            Upload contract
          </Button>
        </Link>
      </div>

      {/* Quick-nav cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {NAV_ITEMS.map((item) => (
          <Link key={item.href} href={`/vendors/${vendorId}/${item.href}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <item.icon className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{item.label}</p>
                    <p className="text-xs text-slate-500">{item.description}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 ml-auto" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Vendor details card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vendor details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-xs font-medium text-slate-500">Contact name</dt>
              <dd className="text-sm text-slate-900 mt-0.5">{vendor.contactName ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Contact email</dt>
              <dd className="text-sm text-slate-900 mt-0.5">
                {vendor.contactEmail ? (
                  <a href={`mailto:${vendor.contactEmail}`} className="text-blue-600 hover:underline">
                    {vendor.contactEmail}
                  </a>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Submission email</dt>
              <dd className="text-sm text-slate-900 mt-0.5">{vendor.submissionEmail ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Submission method</dt>
              <dd className="text-sm text-slate-900 mt-0.5 capitalize">{vendor.submissionMethod}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Health score</dt>
              <dd className="text-sm text-slate-900 mt-0.5">
                {vendor.healthScore != null ? `${vendor.healthScore} / 100` : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Added</dt>
              <dd className="text-sm text-slate-900 mt-0.5">{formatDate(vendor.createdAt)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}
