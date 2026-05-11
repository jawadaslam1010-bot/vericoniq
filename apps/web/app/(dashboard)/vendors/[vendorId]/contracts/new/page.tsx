import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { db } from '@contractly/db'
import { vendors, users } from '@contractly/db/schema'
import { eq, and, isNull } from '@contractly/db'
import { ChevronRight } from 'lucide-react'
import { ContractForm } from '@/components/contracts/ContractForm'

export default async function NewContractPage({
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
        <Link
          href={`/vendors/${vendorId}/contracts`}
          className="hover:text-slate-900"
        >
          Contracts
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-slate-900 font-medium">New contract</span>
      </nav>

      {/* Form */}
      <ContractForm vendorId={vendorId} vendorName={vendor.name} />
    </div>
  )
}
