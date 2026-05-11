import { Suspense } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus, Building2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { db } from '@contractly/db'
import { vendors, users } from '@contractly/db/schema'
import { eq, and, isNull, desc } from '@contractly/db'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Vendors' }

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

async function VendorList() {
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

  const allVendors = await db
    .select()
    .from(vendors)
    .where(and(eq(vendors.orgId, userRecord.orgId), isNull(vendors.deletedAt)))
    .orderBy(desc(vendors.createdAt))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Vendors</h1>
          <p className="text-sm text-slate-500 mt-1">
            {allVendors.length} vendor{allVendors.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/vendors/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add vendor
          </Button>
        </Link>
      </div>

      {allVendors.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-base font-medium text-slate-900 mb-1">No vendors yet</h3>
              <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
                Add your first managed service vendor to start monitoring performance against
                contractual KPIs.
              </p>
              <Link href="/vendors/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add your first vendor
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">All vendors</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left text-xs font-medium text-slate-500 px-6 py-3">
                    Vendor
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 px-6 py-3">
                    Service type
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 px-6 py-3">
                    Contact
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 px-6 py-3">
                    Health
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 px-6 py-3">
                    Status
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 px-6 py-3">
                    Added
                  </th>
                </tr>
              </thead>
              <tbody>
                {allVendors.map((vendor) => (
                  <tr
                    key={vendor.id}
                    className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <Link href={`/vendors/${vendor.id}`} className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-medium text-slate-600">
                            {vendor.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900 hover:text-blue-600">
                            {vendor.name}
                          </p>
                          {vendor.abn && (
                            <p className="text-xs text-slate-400">ABN {vendor.abn}</p>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600">
                        {SERVICE_TYPE_LABELS[vendor.serviceType] ?? vendor.serviceType}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        {vendor.contactName && (
                          <p className="text-sm text-slate-700">{vendor.contactName}</p>
                        )}
                        {vendor.contactEmail && (
                          <p className="text-xs text-slate-400">{vendor.contactEmail}</p>
                        )}
                        {!vendor.contactName && !vendor.contactEmail && (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {vendor.healthScore != null ? (
                        <span
                          className={`text-sm font-medium ${
                            Number(vendor.healthScore) >= 80
                              ? 'text-green-700'
                              : Number(vendor.healthScore) >= 60
                                ? 'text-amber-700'
                                : 'text-red-700'
                          }`}
                        >
                          {vendor.healthScore}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">No data</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
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
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-slate-400">{formatDate(vendor.createdAt)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function VendorListSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Card>
        <CardContent className="p-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-slate-100">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <div className="space-y-1 flex-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

export default function VendorsPage() {
  return (
    <Suspense fallback={<VendorListSkeleton />}>
      <VendorList />
    </Suspense>
  )
}
