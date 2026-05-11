import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { db } from '@contractly/db'
import { vendors, organisations } from '@contractly/db/schema'
import { eq, and, isNull } from '@contractly/db'
import { users } from '@contractly/db/schema'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Building2, AlertTriangle, TrendingUp, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard' }

async function DashboardData() {
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

  const [org] = await db
    .select()
    .from(organisations)
    .where(eq(organisations.id, userRecord.orgId))
    .limit(1)

  const allVendors = await db
    .select()
    .from(vendors)
    .where(and(eq(vendors.orgId, userRecord.orgId), isNull(vendors.deletedAt)))

  const activeVendors = allVendors.filter((v) => v.status === 'active')

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Portfolio overview</h1>
          <p className="text-sm text-slate-500 mt-1">{org?.name}</p>
        </div>
        <Link href="/vendors/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add vendor
          </Button>
        </Link>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-900">{activeVendors.length}</p>
                <p className="text-xs text-slate-500">Active vendors</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-900">—</p>
                <p className="text-xs text-slate-500">Portfolio health</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-900">0</p>
                <p className="text-xs text-slate-500">Active breaches</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-900">$0</p>
                <p className="text-xs text-slate-500">Credits claimable</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vendor list or empty state */}
      {allVendors.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-base font-medium text-slate-900 mb-1">No vendors yet</h3>
              <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
                Add your first managed service vendor to start monitoring performance and enforcing
                SLA obligations.
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
            <CardTitle className="text-base">Vendors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-slate-100">
              {allVendors.map((vendor) => (
                <Link
                  key={vendor.id}
                  href={`/vendors/${vendor.id}`}
                  className="flex items-center justify-between py-3 hover:bg-slate-50 -mx-6 px-6 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center">
                      <span className="text-sm font-medium text-slate-600">
                        {vendor.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{vendor.name}</p>
                      <p className="text-xs text-slate-500 capitalize">{vendor.serviceType}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
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
                    <span className="text-xs text-slate-400">{formatDate(vendor.createdAt)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardData />
    </Suspense>
  )
}
