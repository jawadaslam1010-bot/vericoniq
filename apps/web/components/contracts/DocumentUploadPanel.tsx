'use client'
import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/trpc/client'
import { createBrowserClient } from '@supabase/ssr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Upload, FileText, Loader2, CheckCircle, FileType, X, AlertCircle } from 'lucide-react'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type DocType = 'msa' | 'schedule' | 'annexure' | 'amendment' | 'other'

const DOC_TYPE_LABELS: Record<DocType, string> = {
  msa: 'MSA / Master Agreement',
  schedule: 'Schedule',
  annexure: 'Annexure',
  amendment: 'Amendment',
  other: 'Other',
}

const DOC_TYPE_ORDER: Record<DocType, number> = {
  amendment: 0,
  schedule: 1,
  annexure: 2,
  msa: 4,
  other: 5,
}

function isWordFile(f: File) { return f.name.toLowerCase().endsWith('.docx') }
function isLegacyDoc(f: File) { return f.name.toLowerCase().endsWith('.doc') }
function isPdfFile(f: File) { return f.name.toLowerCase().endsWith('.pdf') }
function isValidFile(f: File) { return isPdfFile(f) || isWordFile(f) }
function stripExt(name: string) { return name.replace(/\.(pdf|docx?)$/i, '') }

type FileStatus = 'pending' | 'converting' | 'uploading' | 'extracting' | 'saving' | 'done' | 'error'

interface QueuedFile {
  file: File
  name: string          // editable document name
  status: FileStatus
  error?: string
}

interface DocumentUploadPanelProps {
  contractId: string
  orgId: string
  onUploadComplete?: () => void
}

export function DocumentUploadPanel({ contractId, orgId, onUploadComplete }: DocumentUploadPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [queue, setQueue] = useState<QueuedFile[]>([])
  const [docType, setDocType] = useState<DocType>('msa')
  const [hierarchyOrder, setHierarchyOrder] = useState<number>(DOC_TYPE_ORDER['msa'])
  const [isUploading, setIsUploading] = useState(false)

  const addDocumentMutation = api.contracts.addDocument.useMutation()
  const saveExtractedTextMutation = api.contracts.saveExtractedText.useMutation()

  // ── File selection ─────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return

    const invalid = files.filter(f => isLegacyDoc(f))
    if (invalid.length) {
      toast.error(`${invalid.map(f => f.name).join(', ')}: .doc files not supported — please Save As .docx in Word first`)
    }

    const valid = files.filter(f => isValidFile(f))
    if (!valid.length) return

    setQueue(prev => [
      ...prev,
      ...valid.map(f => ({ file: f, name: stripExt(f.name), status: 'pending' as FileStatus })),
    ])

    // Reset input so the same files can be re-added if needed
    e.target.value = ''
  }

  const removeFromQueue = (idx: number) => {
    setQueue(prev => prev.filter((_, i) => i !== idx))
  }

  const updateName = (idx: number, name: string) => {
    setQueue(prev => prev.map((item, i) => i === idx ? { ...item, name } : item))
  }

  const setFileStatus = (idx: number, status: FileStatus, error?: string) => {
    setQueue(prev => prev.map((item, i) => i === idx ? { ...item, status, error } : item))
  }

  const handleDocTypeChange = (value: string) => {
    const type = value as DocType
    setDocType(type)
    setHierarchyOrder(DOC_TYPE_ORDER[type])
  }

  // ── Process a single file — returns true on success ───────────────────────
  const processFile = async (item: QueuedFile, idx: number): Promise<boolean> => {
    const { file } = item
    try {
      let fileToUpload: File | Blob = file
      let storageFileName = file.name

      // Step 1 (DOCX only): convert to PDF
      if (isWordFile(file)) {
        setFileStatus(idx, 'converting')
        const formData = new FormData()
        formData.append('file', file)
        const convertRes = await fetch('/api/convert-to-pdf', { method: 'POST', body: formData })
        if (!convertRes.ok) {
          const err = await convertRes.json().catch(() => ({}))
          throw new Error(err.error ?? 'Word → PDF conversion failed')
        }
        fileToUpload = await convertRes.blob()
        storageFileName = file.name.replace(/\.docx?$/i, '.pdf')
      }

      // Step 2: upload to storage
      setFileStatus(idx, 'uploading')
      const storagePath = `${orgId}/${contractId}/${storageFileName}`
      const { error: uploadError } = await supabase.storage
        .from('contracts')
        .upload(storagePath, fileToUpload, { upsert: true, contentType: 'application/pdf' })
      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

      // Step 3: save document record
      const document = await addDocumentMutation.mutateAsync({
        contractId,
        name: item.name.trim() || stripExt(file.name),
        docType,
        hierarchyOrder,
        storagePath,
        fileSizeBytes: fileToUpload.size,
      })

      // Step 4: extract text
      setFileStatus(idx, 'extracting')
      const extractRes = await fetch('/api/extract-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storagePath, documentId: document.id }),
      })
      if (!extractRes.ok) throw new Error(`Text extraction failed`)
      const extractData = await extractRes.json()

      // Step 5: save extracted text
      setFileStatus(idx, 'saving')
      await saveExtractedTextMutation.mutateAsync({
        documentId: document.id,
        text: extractData.text ?? '',
        pageCount: extractData.pageCount,
      })

      setFileStatus(idx, 'done')
      return true
    } catch (err) {
      setFileStatus(idx, 'error', err instanceof Error ? err.message : 'Upload failed')
      return false
    }
  }

  // ── Upload all pending/errored files ───────────────────────────────────────
  const handleUploadAll = async () => {
    // Snapshot which indices need processing right now
    const toProcess = queue
      .map((f, i) => ({ item: f, idx: i }))
      .filter(({ item }) => item.status === 'pending' || item.status === 'error')

    if (!toProcess.length) return

    setIsUploading(true)

    // Track results locally — avoids stale-closure reads of queue state
    let successCount = 0
    let errorCount = 0
    for (const { item, idx } of toProcess) {
      const ok = await processFile(item, idx)
      if (ok) { successCount++ } else { errorCount++ }
    }

    setIsUploading(false)

    if (errorCount === 0) {
      toast.success(`${successCount} document${successCount > 1 ? 's' : ''} uploaded successfully`)
      onUploadComplete?.()
      // Clear only if everything in the whole queue is now done
      setTimeout(() => {
        setQueue(prev => {
          const allDone = prev.every(f => f.status === 'done')
          if (allDone) {
            setDocType('msa')
            setHierarchyOrder(DOC_TYPE_ORDER['msa'])
            return []
          }
          return prev
        })
      }, 1500)
    } else {
      toast.error(
        `${errorCount} file${errorCount > 1 ? 's' : ''} failed — fix errors and retry, or remove them`
      )
    }
  }

  const pendingCount = queue.filter(f => f.status === 'pending' || f.status === 'error').length
  const doneCount = queue.filter(f => f.status === 'done').length

  return (
    <div className="space-y-5">
      {/* Drop zone */}
      <div
        className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 px-6 py-8 text-center cursor-pointer hover:border-muted-foreground/50 hover:bg-muted/30 transition-colors"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="h-7 w-7 text-muted-foreground" />
        <p className="text-sm font-medium">Click to select documents</p>
        <p className="text-xs text-muted-foreground">PDF or DOCX · Multiple files OK · Max 50 MB each</p>
        <p className="text-xs text-muted-foreground/60">Have a .doc file? Open in Word → Save As .docx</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* File queue */}
      {queue.length > 0 && (
        <div className="space-y-2">
          {queue.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
            >
              {/* Icon */}
              <div className="shrink-0">
                {item.status === 'done' ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : item.status === 'error' ? (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                ) : item.status !== 'pending' ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : isWordFile(item.file) ? (
                  <FileType className="h-4 w-4 text-blue-500" />
                ) : (
                  <FileText className="h-4 w-4 text-slate-500" />
                )}
              </div>

              {/* Name (editable while pending) */}
              <div className="flex-1 min-w-0">
                {item.status === 'pending' ? (
                  <Input
                    value={item.name}
                    onChange={e => updateName(idx, e.target.value)}
                    className="h-7 text-xs px-2"
                    placeholder="Document name"
                  />
                ) : (
                  <p className="text-xs font-medium truncate">{item.name || item.file.name}</p>
                )}
                {item.status === 'error' && (
                  <p className="text-xs text-red-500 mt-0.5 truncate">{item.error}</p>
                )}
                {item.status !== 'pending' && item.status !== 'error' && item.status !== 'done' && (
                  <p className="text-xs text-muted-foreground mt-0.5 capitalize">{item.status}…</p>
                )}
              </div>

              {/* File size */}
              <span className="shrink-0 text-xs text-muted-foreground">
                {(item.file.size / 1024 / 1024).toFixed(1)} MB
              </span>

              {/* Word badge */}
              {isWordFile(item.file) && item.status === 'pending' && (
                <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                  DOCX→PDF
                </span>
              )}

              {/* Remove (pending or errored, not while actively uploading) */}
              {(item.status === 'pending' || item.status === 'error') && !isUploading && (
                <button
                  onClick={() => removeFromQueue(idx)}
                  className="shrink-0 text-muted-foreground hover:text-red-500 transition-colors"
                  title="Remove from queue"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Doc type + hierarchy (apply to all files in batch) */}
      {queue.some(f => f.status === 'pending') && (
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Applied to all selected files
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Document type</Label>
              <Select value={docType} onValueChange={handleDocTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(DOC_TYPE_LABELS) as DocType[]).map(type => (
                    <SelectItem key={type} value={type}>
                      {DOC_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hierarchyOrder">
                Hierarchy order
                <span className="ml-1 text-xs text-muted-foreground font-normal">(lower = higher precedence)</span>
              </Label>
              <Input
                id="hierarchyOrder"
                type="number"
                min={0}
                value={hierarchyOrder}
                onChange={e => setHierarchyOrder(Number(e.target.value))}
              />
            </div>
          </div>
        </div>
      )}

      {/* Progress summary */}
      {isUploading && (
        <div className="flex items-center gap-2 rounded-md bg-muted px-4 py-2.5 text-sm">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
          <span>Uploading {doneCount + 1} of {queue.length}…</span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        {/* Add more — always visible when not uploading */}
        {!isUploading && (
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            {queue.length === 0 ? 'Select files' : 'Add more'}
          </Button>
        )}

        {/* Upload pending/errored files */}
        {pendingCount > 0 && (
          <Button className="flex-1" onClick={handleUploadAll} disabled={isUploading}>
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload {pendingCount} file{pendingCount > 1 ? 's' : ''}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
