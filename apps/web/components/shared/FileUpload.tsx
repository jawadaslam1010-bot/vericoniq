'use client'

import { useRef, useState, useCallback } from 'react'
import { Upload, X, FileText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024 // 50 MB

type UploadedFile = {
  name: string
  size: number
  storagePath: string
  mimeType: string
}

type FileUploadProps = {
  orgId: string
  vendorId: string
  accept?: string
  onUpload: (file: UploadedFile) => void
  onRemove?: () => void
  uploadedFile?: UploadedFile | null
  disabled?: boolean
}

export function FileUpload({
  orgId,
  vendorId,
  accept = '.pdf,.docx,.doc',
  onUpload,
  onRemove,
  uploadedFile,
  disabled = false,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const supabase = createClient()

  async function uploadFile(file: File) {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error(`File is too large. Maximum size is 50 MB.`)
      return
    }

    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only PDF and Word documents are accepted')
      return
    }

    setIsUploading(true)

    try {
      // Storage path: {org_id}/{vendor_id}/{timestamp}-{filename}
      // org_id as first path component is required for storage RLS
      const timestamp = Date.now()
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const storagePath = `${orgId}/${vendorId}/${timestamp}-${safeName}`

      const { error } = await supabase.storage.from('contracts').upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

      if (error) {
        toast.error(`Upload failed: ${error.message}`)
        return
      }

      onUpload({
        name: file.name,
        size: file.size,
        storagePath,
        mimeType: file.type,
      })

      toast.success(`${file.name} uploaded successfully`)
    } finally {
      setIsUploading(false)
    }
  }

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(false)
      if (disabled || isUploading) return

      const file = e.dataTransfer.files[0]
      if (file) await uploadFile(file)
    },
    [disabled, isUploading]
  )

  const handleFileInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) await uploadFile(file)
      // Reset input so same file can be re-selected if needed
      if (inputRef.current) inputRef.current.value = ''
    },
    [disabled, isUploading]
  )

  if (uploadedFile) {
    return (
      <div className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg bg-slate-50">
        <div className="p-2 bg-white rounded-md border border-slate-200">
          <FileText className="h-5 w-5 text-slate-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 truncate">{uploadedFile.name}</p>
          <p className="text-xs text-slate-500">
            {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>
        {onRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 hover:text-red-600"
            onClick={onRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'relative border-2 border-dashed rounded-lg p-8 text-center transition-colors',
        isDragging ? 'border-blue-400 bg-blue-50' : 'border-slate-300 hover:border-slate-400',
        (disabled || isUploading) && 'opacity-50 cursor-not-allowed',
        !disabled && !isUploading && 'cursor-pointer'
      )}
      onDragOver={(e) => {
        e.preventDefault()
        if (!disabled && !isUploading) setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && !isUploading && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFileInput}
        disabled={disabled || isUploading}
      />

      {isUploading ? (
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
          <p className="text-sm text-slate-600">Uploading...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <div className="p-3 bg-slate-100 rounded-full">
            <Upload className="h-6 w-6 text-slate-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700">
              Drop your file here, or{' '}
              <span className="text-blue-600">browse</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">PDF or Word documents up to 50 MB</p>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper: get a signed URL for a document (1-hour expiry — never use public URLs)
export async function getSignedUrl(storagePath: string): Promise<string | null> {
  const supabase = createClient()
  const { data, error } = await supabase.storage
    .from('contracts')
    .createSignedUrl(storagePath, 3600) // 1 hour

  if (error) {
    console.error('Failed to generate signed URL:', error)
    return null
  }

  return data.signedUrl
}
