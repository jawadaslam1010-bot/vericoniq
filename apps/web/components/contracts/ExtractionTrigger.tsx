'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Cpu, CheckCircle, AlertCircle, Loader2, AlertTriangle } from 'lucide-react'

interface Props {
  contractId: string
  vendorId: string
  extractionStatus: string
  kpiCount: number
  termCount?: number
}

export function ExtractionTrigger({ contractId, vendorId, extractionStatus, kpiCount, termCount = 0 }: Props) {
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
      setIsLoading(false)
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
    const nothingFound = kpiCount === 0 && termCount === 0
    return (
      <div className={`rounded-lg border p-6 ${nothingFound ? 'border-amber-200 bg-amber-50' : 'border-green-200 bg-green-50'}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {nothingFound
              ? <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
              : <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
            }
            <div>
              <p className={`font-medium ${nothingFound ? 'text-amber-800' : 'text-green-800'}`}>
                {nothingFound ? 'Nothing found' : 'Extraction complete'}
              </p>
              <p className={`text-sm ${nothingFound ? 'text-amber-700' : 'text-green-700'}`}>
                {nothingFound
                  ? 'No KPIs or key terms detected. Check that your documents are contract files with readable text.'
                  : `${kpiCount} KPIs extracted`
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={runExtraction}
              disabled={isLoading}
              className="border-green-300 text-green-700 hover:bg-green-100"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Re-running…
                </>
              ) : (
                <>
                  <Cpu className="mr-2 h-4 w-4" />
                  Re-run
                </>
              )}
            </Button>
            <Link href={`/vendors/${vendorId}/contracts/${contractId}/kpis`}>
              <Button variant="default" size="sm">
                View KPI Register
              </Button>
            </Link>
          </div>
        </div>
        {isLoading && (
          <p className="text-xs text-green-700 border-t border-green-200 pt-3 mt-3">
            ⏱ Re-running extraction — this will replace existing unactivated KPIs. Takes 1–3 minutes.
          </p>
        )}
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
