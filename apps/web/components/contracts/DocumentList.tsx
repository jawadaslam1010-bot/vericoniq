'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import {
  FileText,
  CheckCircle,
  Clock,
  Pencil,
  Trash2,
  X,
  Check,
  AlertTriangle,
} from 'lucide-react'

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

function docTypeBadgeClass(docType: string) {
  switch (docType) {
    case 'amendment': return 'bg-purple-100 text-purple-700'
    case 'schedule':  return 'bg-blue-100 text-blue-700'
    case 'annexure':  return 'bg-indigo-100 text-indigo-700'
    case 'msa':       return 'bg-slate-100 text-slate-700'
    default:          return 'bg-gray-100 text-gray-700'
  }
}

type Document = {
  id: string
  name: string
  docType: string | null
  hierarchyOrder: number
  pageCount: number | null
  storagePath: string
  extractedText?: string | null
}

interface DocumentListProps {
  documents: Document[]
}

export function DocumentList({ documents }: DocumentListProps) {
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Edit state
  const [editName, setEditName] = useState('')
  const [editDocType, setEditDocType] = useState<DocType>('msa')
  const [editHierarchy, setEditHierarchy] = useState(4)

  const updateMutation = api.contracts.updateDocument.useMutation({
    onSuccess: () => {
      toast.success('Document updated')
      setEditingId(null)
      router.refresh()
    },
    onError: (err) => toast.error(err.message),
  })

  const deleteMutation = api.contracts.deleteDocument.useMutation({
    onSuccess: async (data) => {
      // Also remove from Supabase Storage
      if (data.storagePath) {
        await supabase.storage.from('contracts').remove([data.storagePath])
      }
      toast.success('Document deleted')
      setDeletingId(null)
      router.refresh()
    },
    onError: (err) => toast.error(err.message),
  })

  const startEdit = (doc: Document) => {
    setEditingId(doc.id)
    setEditName(doc.name)
    setEditDocType((doc.docType as DocType) ?? 'other')
    setEditHierarchy(doc.hierarchyOrder)
    setDeletingId(null)
  }

  const cancelEdit = () => setEditingId(null)

  const saveEdit = () => {
    if (!editingId) return
    updateMutation.mutate({
      documentId: editingId,
      name: editName,
      docType: editDocType,
      hierarchyOrder: editHierarchy,
    })
  }

  const handleDocTypeChange = (val: string) => {
    const type = val as DocType
    setEditDocType(type)
    setEditHierarchy(DOC_TYPE_ORDER[type])
  }

  if (documents.length === 0) return null

  return (
    <ul className="divide-y divide-slate-100 mb-4">
      {documents.map((doc) => {
        const isEditing = editingId === doc.id
        const isDeleting = deletingId === doc.id
        const hasText = doc.extractedText != null && doc.extractedText !== ''

        return (
          <li key={doc.id} className="py-3">
            {isEditing ? (
              /* ── Edit form ────────────────────────────────────────────── */
              <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Document name</Label>
                  <Input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Document type</Label>
                    <Select value={editDocType} onValueChange={handleDocTypeChange}>
                      <SelectTrigger className="h-8 text-sm">
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
                    <Label className="text-xs">Hierarchy order</Label>
                    <Input
                      type="number"
                      min={0}
                      value={editHierarchy}
                      onChange={e => setEditHierarchy(Number(e.target.value))}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={saveEdit}
                    disabled={updateMutation.isPending}
                  >
                    <Check className="mr-1 h-3 w-3" />
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={cancelEdit}
                    disabled={updateMutation.isPending}
                  >
                    <X className="mr-1 h-3 w-3" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : isDeleting ? (
              /* ── Delete confirm ───────────────────────────────────────── */
              <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                <p className="flex-1 text-sm text-red-700">
                  Delete <span className="font-medium">{doc.name}</span>? This cannot be undone.
                </p>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-7 text-xs shrink-0"
                  onClick={() => deleteMutation.mutate({ documentId: doc.id })}
                  disabled={deleteMutation.isPending}
                >
                  Delete
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs shrink-0"
                  onClick={() => setDeletingId(null)}
                  disabled={deleteMutation.isPending}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              /* ── Normal row ───────────────────────────────────────────── */
              <div className="flex items-center gap-3 group">
                <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium shrink-0 ${docTypeBadgeClass(doc.docType ?? 'other')}`}>
                  {doc.docType ?? 'other'}
                </span>
                <span
                  className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500 shrink-0"
                  title={`Hierarchy order ${doc.hierarchyOrder} — lower number = higher precedence`}
                >
                  #{doc.hierarchyOrder}
                </span>
                <span className="flex-1 min-w-0 text-sm font-medium text-slate-800 truncate">
                  {doc.name}
                </span>
                {doc.pageCount != null && (
                  <span className="text-xs text-slate-400 shrink-0">{doc.pageCount}p</span>
                )}
                <div className="shrink-0">
                  {hasText ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Clock className="h-4 w-4 text-slate-300" />
                  )}
                </div>
                {/* Action buttons — visible on hover */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => startEdit(doc)}
                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                    title="Edit document type"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => { setDeletingId(doc.id); setEditingId(null) }}
                    className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                    title="Delete document"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
