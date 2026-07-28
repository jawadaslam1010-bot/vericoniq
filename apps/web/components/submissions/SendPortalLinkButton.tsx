'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/trpc/client'
import { Send, Link2, Copy, Check, Loader2, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Props = {
  periodId: string
  appUrl?: string
}

type Mode = 'idle' | 'form' | 'done'

export function SendPortalLinkButton({ periodId, appUrl = '' }: Props) {
  const [mode, setMode] = useState<Mode>('idle')
  const [email, setEmail] = useState('')
  const [sendEmail, setSendEmail] = useState(true)
  const [generatedToken, setGeneratedToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const generateToken = api.submissions.generateToken.useMutation()

  const handleGenerate = async () => {
    if (sendEmail && !email.trim()) {
      toast.error('Enter a vendor email address')
      return
    }

    try {
      const result = await generateToken.mutateAsync({
        periodId,
        vendorEmail: email.trim() || undefined,
        sendEmail: sendEmail && !!email.trim(),
      })
      setGeneratedToken(result.token)
      setMode('done')
      if (sendEmail && email.trim()) {
        toast.success(`Link sent to ${email.trim()}`)
      } else {
        toast.success('Link generated')
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate link')
    }
  }

  const portalUrl = generatedToken ? `${appUrl}/portal/${generatedToken}` : ''

  const copyLink = async () => {
    if (!portalUrl) return
    await navigator.clipboard.writeText(portalUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (mode === 'done' && generatedToken) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-[12px] text-emerald-700 font-medium max-w-[240px] truncate">
          <Link2 className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{portalUrl}</span>
        </div>
        <button
          onClick={copyLink}
          className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium border border-border rounded-lg hover:bg-hover transition-colors text-muted hover:text-ink"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
        <button
          onClick={() => { setMode('idle'); setGeneratedToken(null); setEmail('') }}
          className="text-[12px] text-muted hover:text-ink transition-colors"
        >
          New link
        </button>
      </div>
    )
  }

  if (mode === 'form') {
    return (
      <div className="flex items-center gap-2">
        <input
          autoFocus
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleGenerate()}
          placeholder="vendor@example.com"
          className="w-52 px-3 py-1.5 text-[13px] border border-border rounded-lg bg-page focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
        <label className="flex items-center gap-1.5 text-[12px] text-muted cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={sendEmail}
            onChange={e => setSendEmail(e.target.checked)}
            className="w-3.5 h-3.5 rounded accent-primary"
          />
          Send email
        </label>
        <Button
          size="sm"
          onClick={handleGenerate}
          disabled={generateToken.isPending}
          className="shrink-0"
        >
          {generateToken.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : sendEmail && email.trim() ? (
            <><Send className="w-3.5 h-3.5 mr-1.5" />Send</>
          ) : (
            <><Link2 className="w-3.5 h-3.5 mr-1.5" />Generate</>
          )}
        </Button>
        <button
          onClick={() => setMode('idle')}
          className="text-[12px] text-muted hover:text-ink transition-colors"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setMode('form')}
      className="gap-1.5"
    >
      <Send className="w-3.5 h-3.5" />
      Send portal link
    </Button>
  )
}
