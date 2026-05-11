import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { db } from '@contractly/db'
import { users, vendors } from '@contractly/db/schema'
import { contracts, kpis, contractKeyTerms } from '@contractly/db/schema'
import { eq, and, asc } from '@contractly/db'
import { ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { KpiReviewClient, ConfirmKpisButton } from '@/components/contracts/KpiReviewClient'

export default async function KpisPage({
  params,
}: {
  params: Promise<{ vendorId: string; contractId: string }>
}) {
  const { vendorId, contractId } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [userRecord] = await db
    .select()
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1)

  if (!userRecord) {
    redirect('/login')
  }

  const [contract] = await db
    .select()
    .from(contracts)
    .where(and(eq(contracts.id, contractId), eq(contracts.orgId, userRecord.orgId)))
    .limit(1)

  if (!contract) {
    notFound()
  }

  const [vendor] = await db
    .select()
    .from(vendors)
    .where(and(eq(vendors.id, contract.vendorId), eq(vendors.orgId, userRecord.orgId)))
    .limit(1)

  if (!vendor) {
    notFound()
  }

  const kpiRows = await db
    .select()
    .from(kpis)
    .where(and(eq(kpis.contractId, contractId), eq(kpis.orgId, userRecord.orgId)))
    .orderBy(asc(kpis.kpiType), asc(kpis.name))

  const keyTermRows = await db
    .select()
    .from(contractKeyTerms)
    .where(
      and(
        eq(contractKeyTerms.contractId, contractId),
        eq(contractKeyTerms.orgId, userRecord.orgId),
      ),
    )

  const contractPath = `/vendors/${vendorId}/contracts/${contractId}`

  const isNotReady =
    contract.extractionStatus === 'pending' ||
    contract.extractionStatus === 'failed' ||
    contract.extractionStatus === 'processing'

  return (
    <div className="space-y-6 p-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/vendors" className="hover:text-foreground transition-colors">
          Vendors
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link href={`/vendors/${vendorId}`} className="hover:text-foreground transition-colors">
          {vendor.name}
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link
          href={`/vendors/${vendorId}/contracts`}
          className="hover:text-foreground transition-colors"
        >
          Contracts
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link href={contractPath} className="hover:text-foreground transition-colors">
          {contract.name}
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">KPI Register</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">KPI Register</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {kpiRows.length} KPIs · {keyTermRows.length} key terms
          </p>
        </div>
        {kpiRows.length > 0 && <ConfirmKpisButton contractId={contractId} />}
      </div>

      {/* Not-ready states */}
      {isNotReady && (
        <Card>
          <CardContent className="py-6">
            {contract.extractionStatus === 'processing' && (
              <div className="flex flex-col gap-3">
                <p className="font-medium">Extraction is currently in progress.</p>
                <p className="text-sm text-muted-foreground">
                  KPIs will appear here once extraction completes. Please check back shortly.
                </p>
                <div>
                  <Button asChild variant="outline" size="sm">
                    <Link href={contractPath}>Back to contract</Link>
                  </Button>
                </div>
              </div>
            )}
            {contract.extractionStatus === 'pending' && (
              <div className="flex flex-col gap-3">
                <p className="font-medium">Extraction has not been run yet.</p>
                <p className="text-sm text-muted-foreground">
                  Return to the contract page and run AI extraction to populate this register.
                </p>
                <div>
                  <Button asChild variant="outline" size="sm">
                    <Link href={contractPath}>Back to contract</Link>
                  </Button>
                </div>
              </div>
            )}
            {contract.extractionStatus === 'failed' && (
              <div className="flex flex-col gap-3">
                <p className="font-medium text-destructive">Extraction failed.</p>
                <p className="text-sm text-muted-foreground">
                  The extraction did not complete successfully. Return to the contract page to retry.
                </p>
                <div>
                  <Button asChild variant="outline" size="sm">
                    <Link href={contractPath}>Back to contract</Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
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
