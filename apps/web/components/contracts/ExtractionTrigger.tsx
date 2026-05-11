'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Cpu, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

interface Props {
  contractId: string
  vendorId: string
  extractionStatus: string
  kpiCount: number
}

export function ExtractionTrigger({ contractId, vendorId, extractionStatus, kpiCount }: Props) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (extractionStatus !== 'processing') return
    const t = setInterval(() => router.refresh(), 5000)
    return () => clearInterval(t)
  }, [router, extractionStatus])

  async function runExtraction() {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/contracts/${contractId}/extract`, { method: 'POST' })
      if (!res.ok) {
        toast.error('Extraction failed. Please try again.')
        setIsLoading(false)
        return
      }
      router.refresh()
    } catch {
      toast.error('Could not reach the server. Please try again.')
      setIsLoading(false)
    }
  }

  if (extractionStatus === 'processing') {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-amber-600 shrink-0" />
          <div>
            <p className="font-medium text-amber-800">Extraction in progress…</p>
            <p className="text-sm text-amber-700">
              Analysing your documents with AI. This page refreshes automatically every 5 seconds.
            </p>
            <p className="mt-1 text-xs text-amber-600">
              ⏱ Typically 1–3 minutes depending on the number and size of documents.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (extractionStatus === 'complete') {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-green-800">Extraction complete</p>
              <p className="text-sm text-green-700">{kpiCount} KPIs extracted</p>
            </div>
          </div>
          <Link href={`/vendors/${vendorId}/contracts/${contractId}/kpis`}>
            <Button variant="default" size="sm">
              View KPI Register
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  if (extractionStatus === 'failed') {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <div>
              <p className="font-medium text-red-800">Extraction failed</p>
              <p className="text-sm text-red-700">Check documents have readable text.</p>
            </div>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={runExtraction}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Retrying...
              </>
            ) : (
              'Retry extraction'
            )}
          </Button>
        </div>
        {isLoading && (
          <p className="text-xs text-red-600 border-t border-red-200 pt-3">
            ⏱ Processing has started. This may take <span className="font-medium">1–3 minutes</span> depending
            on the number and size of your documents. The page will update automatically — you can leave
            this tab open.
          </p>
        )}
      </div>
    )
  }

  // Default: pending
  return (
    <div className="rounded-lg border border-border bg-muted/40 p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-foreground">AI Extraction</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload your contract documents above, then run AI extraction to automatically identify
            KPIs, key dates, and obligations.
          </p>
        </div>
        <Button onClick={runExtraction} disabled={isLoading} size="sm" className="shrink-0">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Starting…
            </>
          ) : (
            <>
              <Cpu className="mr-2 h-4 w-4" />
              Run AI Extraction
            </>
          )}
        </Button>
      </div>
      {isLoading && (
        <p className="text-xs text-muted-foreground border-t border-border pt-3">
          ⏱ Processing has started. This may take <span className="font-medium">1–3 minutes</span> depending
          on the number and size of your documents. The page will update automatically — you can leave
          this tab open.
        </p>
      )}
      {!isLoading && (
        <p className="text-xs text-muted-foreground border-t border-border pt-3">
          ⏱ Extraction typically takes 1–3 minutes for large contracts with multiple annexures and schedules.
        </p>
      )}
    </div>
  )
}
