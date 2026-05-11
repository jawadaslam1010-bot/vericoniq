import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { eq, and, count, desc } from '@contractly/db'
import { router, viewerProcedure, managerProcedure } from '../trpc'
import { contracts, contractDocuments, kpis } from '@contractly/db/schema'

// ─── Router ───────────────────────────────────────────────────────────────────

export const contractsRouter = router({
  // List all contracts for a vendor, with document counts
  list: viewerProcedure
    .input(z.object({ vendorId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const contractList = await ctx.db
        .select()
        .from(contracts)
        .where(and(eq(contracts.vendorId, input.vendorId), eq(contracts.orgId, ctx.user.orgId)))
        .orderBy(desc(contracts.createdAt))

      const results = await Promise.all(
        contractList.map(async (c) => {
          const [{ value }] = await ctx.db
            .select({ value: count() })
            .from(contractDocuments)
            .where(eq(contractDocuments.contractId, c.id))
          return { ...c, documentCount: Number(value) }
        })
      )

      return results
    }),

  // Get a single contract with its documents and KPI count
  get: viewerProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [contract] = await ctx.db
        .select()
        .from(contracts)
        .where(and(eq(contracts.id, input.id), eq(contracts.orgId, ctx.user.orgId)))
        .limit(1)

      if (!contract) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Contract not found' })
      }

      const documents = await ctx.db
        .select({
          id: contractDocuments.id,
          contractId: contractDocuments.contractId,
          orgId: contractDocuments.orgId,
          name: contractDocuments.name,
          docType: contractDocuments.docType,
          hierarchyOrder: contractDocuments.hierarchyOrder,
          storagePath: contractDocuments.storagePath,
          fileSizeBytes: contractDocuments.fileSizeBytes,
          pageCount: contractDocuments.pageCount,
          supersedesDocId: contractDocuments.supersedesDocId,
          supersedesClause: contractDocuments.supersedesClause,
          uploadedBy: contractDocuments.uploadedBy,
          createdAt: contractDocuments.createdAt,
        })
        .from(contractDocuments)
        .where(eq(contractDocuments.contractId, contract.id))

      const [{ value: kpiCount }] = await ctx.db
        .select({ value: count() })
        .from(kpis)
        .where(eq(kpis.contractId, contract.id))

      return { contract, documents, kpiCount: Number(kpiCount) }
    }),

  // Create a new contract
  create: managerProcedure
    .input(
      z.object({
        vendorId: z.string().uuid(),
        name: z.string().min(1).max(200),
        contractNumber: z.string().max(100).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        noticePeriodDays: z.number().int().min(0).optional(),
        autoRenewal: z.boolean().default(false),
        autoRenewalMonths: z.number().int().min(1).optional(),
        annualValue: z.string().optional(),
        monthlyValue: z.string().optional(),
        perspective: z.enum(['buyer', 'vendor']).default('buyer'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [contract] = await ctx.db
        .insert(contracts)
        .values({
          orgId: ctx.user.orgId,
          vendorId: input.vendorId,
          name: input.name,
          contractNumber: input.contractNumber ?? null,
          startDate: input.startDate ?? null,
          endDate: input.endDate ?? null,
          noticePeriodDays: input.noticePeriodDays ?? null,
          autoRenewal: input.autoRenewal,
          autoRenewalMonths: input.autoRenewalMonths ?? null,
          annualValue: input.annualValue ?? null,
          monthlyValue: input.monthlyValue ?? null,
          perspective: input.perspective,
          extractionStatus: 'pending',
        })
        .returning()

      return contract
    }),

  // Update extraction status on a contract
  updateExtractionStatus: managerProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum(['pending', 'processing', 'complete', 'failed']),
        aiNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select({ id: contracts.id })
        .from(contracts)
        .where(and(eq(contracts.id, input.id), eq(contracts.orgId, ctx.user.orgId)))
        .limit(1)

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Contract not found' })
      }

      const [updated] = await ctx.db
        .update(contracts)
        .set({
          extractionStatus: input.status,
          aiExtractionNotes: input.aiNotes ?? null,
          updatedAt: new Date(),
        })
        .where(and(eq(contracts.id, input.id), eq(contracts.orgId, ctx.user.orgId)))
        .returning()

      return updated
    }),

  // Add a document to a contract
  addDocument: managerProcedure
    .input(
      z.object({
        contractId: z.string().uuid(),
        name: z.string().min(1),
        docType: z.enum(['msa', 'schedule', 'annexure', 'amendment', 'other']),
        hierarchyOrder: z.number().int().min(0).max(10),
        storagePath: z.string(),
        fileSizeBytes: z.number().int().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [contract] = await ctx.db
        .select({ id: contracts.id })
        .from(contracts)
        .where(and(eq(contracts.id, input.contractId), eq(contracts.orgId, ctx.user.orgId)))
        .limit(1)

      if (!contract) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Contract not found' })
      }

      const [document] = await ctx.db
        .insert(contractDocuments)
        .values({
          contractId: input.contractId,
          orgId: ctx.user.orgId,
          name: input.name,
          docType: input.docType,
          hierarchyOrder: input.hierarchyOrder,
          storagePath: input.storagePath,
          fileSizeBytes: input.fileSizeBytes ?? null,
          uploadedBy: ctx.user.id,
        })
        .returning()

      return document
    }),

  // Save extracted text and page count to a document
  saveExtractedText: managerProcedure
    .input(
      z.object({
        documentId: z.string().uuid(),
        text: z.string(),
        pageCount: z.number().int().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select({ id: contractDocuments.id })
        .from(contractDocuments)
        .where(
          and(
            eq(contractDocuments.id, input.documentId),
            eq(contractDocuments.orgId, ctx.user.orgId)
          )
        )
        .limit(1)

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Document not found' })
      }

      const [updated] = await ctx.db
        .update(contractDocuments)
        .set({
          extractedText: input.text,
          pageCount: input.pageCount ?? null,
        })
        .where(
          and(
            eq(contractDocuments.id, input.documentId),
            eq(contractDocuments.orgId, ctx.user.orgId)
          )
        )
        .returning()

      return updated
    }),

  // Update a document's type and hierarchy order
  updateDocument: managerProcedure
    .input(
      z.object({
        documentId: z.string().uuid(),
        name: z.string().min(1).optional(),
        docType: z.enum(['msa', 'schedule', 'annexure', 'amendment', 'other']).optional(),
        hierarchyOrder: z.number().int().min(0).max(10).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select({ id: contractDocuments.id })
        .from(contractDocuments)
        .where(and(eq(contractDocuments.id, input.documentId), eq(contractDocuments.orgId, ctx.user.orgId)))
        .limit(1)
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Document not found' })

      const [updated] = await ctx.db
        .update(contractDocuments)
        .set({
          ...(input.name !== undefined && { name: input.name }),
          ...(input.docType !== undefined && { docType: input.docType }),
          ...(input.hierarchyOrder !== undefined && { hierarchyOrder: input.hierarchyOrder }),
        })
        .where(and(eq(contractDocuments.id, input.documentId), eq(contractDocuments.orgId, ctx.user.orgId)))
        .returning()
      return updated
    }),

  // Delete a single document (also removes from storage path is handled client-side)
  deleteDocument: managerProcedure
    .input(z.object({ documentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select({ id: contractDocuments.id, storagePath: contractDocuments.storagePath })
        .from(contractDocuments)
        .where(and(eq(contractDocuments.id, input.documentId), eq(contractDocuments.orgId, ctx.user.orgId)))
        .limit(1)
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Document not found' })

      await ctx.db
        .delete(contractDocuments)
        .where(and(eq(contractDocuments.id, input.documentId), eq(contractDocuments.orgId, ctx.user.orgId)))

      return { success: true, storagePath: existing.storagePath }
    }),

  // Hard delete a contract (cascade removes children)
  delete: managerProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select({ id: contracts.id })
        .from(contracts)
        .where(and(eq(contracts.id, input.id), eq(contracts.orgId, ctx.user.orgId)))
        .limit(1)

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Contract not found' })
      }

      await ctx.db
        .delete(contracts)
        .where(and(eq(contracts.id, input.id), eq(contracts.orgId, ctx.user.orgId)))

      return { success: true }
    }),
})
