import { router, viewerProcedure } from '../trpc'
import { vendors, contracts, kpis } from '@contractly/db/schema'
import { eq, and, isNull, ilike } from '@contractly/db'
import { z } from 'zod'

export type SearchResult = {
  kind: 'vendor' | 'contract' | 'kpi'
  id: string
  title: string
  subtitle: string
  href: string
}

export const searchRouter = router({
  query: viewerProcedure
    .input(z.object({ q: z.string().min(1).max(100) }))
    .query(async ({ ctx, input }): Promise<SearchResult[]> => {
      const pattern = `%${input.q.trim()}%`
      const orgId = ctx.user.orgId

      const [vendorRows, contractRows, kpiRows] = await Promise.all([
        ctx.db
          .select({ id: vendors.id, name: vendors.name, serviceType: vendors.serviceType })
          .from(vendors)
          .where(and(eq(vendors.orgId, orgId), isNull(vendors.deletedAt), ilike(vendors.name, pattern)))
          .limit(5),
        ctx.db
          .select({ id: contracts.id, name: contracts.name, vendorId: contracts.vendorId, vendorName: vendors.name })
          .from(contracts)
          .innerJoin(vendors, eq(contracts.vendorId, vendors.id))
          .where(and(eq(contracts.orgId, orgId), isNull(vendors.deletedAt), ilike(contracts.name, pattern)))
          .limit(5),
        ctx.db
          .select({
            id: kpis.id,
            name: kpis.name,
            contractId: kpis.contractId,
            contractName: contracts.name,
            vendorId: contracts.vendorId,
            vendorName: vendors.name,
          })
          .from(kpis)
          .innerJoin(contracts, eq(kpis.contractId, contracts.id))
          .innerJoin(vendors, eq(contracts.vendorId, vendors.id))
          .where(and(eq(kpis.orgId, orgId), isNull(vendors.deletedAt), ilike(kpis.name, pattern)))
          .limit(6),
      ])

      const results: SearchResult[] = [
        ...vendorRows.map(v => ({
          kind: 'vendor' as const,
          id: v.id,
          title: v.name,
          subtitle: v.serviceType,
          href: `/vendors/${v.id}`,
        })),
        ...contractRows.map(c => ({
          kind: 'contract' as const,
          id: c.id,
          title: c.name,
          subtitle: c.vendorName,
          href: `/vendors/${c.vendorId}/contracts/${c.id}`,
        })),
        ...kpiRows.map(k => ({
          kind: 'kpi' as const,
          id: k.id,
          title: k.name,
          subtitle: `${k.vendorName} · ${k.contractName}`,
          href: `/vendors/${k.vendorId}/contracts/${k.contractId}/kpis`,
        })),
      ]

      return results
    }),
})
