'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/trpc/client'
import { Link2, Send, Copy, Check, Loader2, ExternalLink, Eye, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Props = {
  periodId: string
  appUrl: string
}

function fmtDateTime(d: Date | string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function fmtDate(d: Date | string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function PortalLinksPanel({ periodId, appUrl }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [email, setEmail] = useState('')
  const [sendEmail, setSendEmail] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const { data: tokens, isLoading, refetch } = api.submissions.listTokens.useQuery(
    { periodId },
    { enabled: expanded }
  )

  const generateToken = api.submissions.generateToken.useMutation({
    onSuccess: () => {
      refetch()
      setEmail('')
      setShowForm(false)
    },
  })

  const handleGenerate = async () => {
    if (sendEmail && !email.trim()) {
      toast.error('Enter a vendor email address')
      return
    }
    try {
      await generateToken.mutateAsync({
        periodId,
        vendorEmail: email.trim() || undefined,
        sendEmail: sendEmail && !!email.trim(),
      })
      if (sendEmail && email.trim()) {
        toast.success(`Link sent to ${email.trim()}`)
      } else {
        toast.success('Link generated')
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate link')
    }
  }

  const copyLink = async (token: string, id: string) => {
    await navigator.clipboard.writeText(`${appUrl}/portal/${token}`)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-hover transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Link2 className="w-4 h-4 text-muted" />
          <span className="text-[13px] font-semibold text-ink">Portal links</span>
          {tokens && tokens.length > 0 && (
            <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
              {tokens.length}
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
      </button>

      {expanded && (
        <div className="border-t border-border">
          {isLoading ? (
            <div className="px-5 py-6 flex items-center gap-2 text-muted text-[13px]">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading…
            </div>
          ) : tokens && tokens.length > 0 ? (
            <div className="divide-y divide-border-soft">
              {tokens.map(t => {
                const portalUrl = `${appUrl}/portal/${t.token}`
                const isExpired = new Date(t.expiresAt) < new Date()

                return (
                  <div key={t.id} className="px-5 py-3.5 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {t.vendorEmail ? (
                          <span className="text-[13px] text-ink font-medium truncate">{t.vendorEmail}</span>
                        ) : (
                          <span className="text-[13px] text-muted italic">No email — link only</span>
                        )}
                        {t.openedAt ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                            <Eye className="w-2.5 h-2.5" />
                            Opened
                          </span>
                        ) : isExpired ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 shrink-0">
                            Expired
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-surface text-faint border border-border shrink-0">
                            <Clock className="w-2.5 h-2.5" />
                            Not opened
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-faint mt-0.5">
                        Generated {fmtDateTime(t.createdAt)}
                        {t.openedAt && ` · Opened ${fmtDateTime(t.openedAt)}`}
                        {!isExpired && ` · Expires ${fmtDate(t.expiresAt)}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => copyLink(t.token, t.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium border border-border rounded-lg hover:bg-hover transition-colors text-muted hover:text-ink"
                      >
                        {copiedId === t.id ? (
                          <><Check className="w-3 h-3 text-emerald-600" /> Copied</>
                        ) : (
                          <><Copy className="w-3 h-3" /> Copy</>
                        )}
                      </button>
                      <a
                        href={portalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium border border-border rounded-lg hover:bg-hover transition-colors text-muted hover:text-ink"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Open
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="px-5 py-5 text-center">
              <p className="text-[13px] text-muted">No portal links generated yet for this period.</p>
            </div>
          )}

          {/* Generate new link */}
          <div className="px-5 py-4 border-t border-border-soft bg-header-cell">
            {showForm ? (
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  autoFocus
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                  placeholder="vendor@example.com"
                  className="w-52 px-3 py-1.5 text-[13px] border border-border rounded-lg bg-page focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <label className="flex items-center gap-1.5 text-[12px] text-muted cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendEmail}
                    onChange={e => setSendEmail(e.target.checked)}
                    className="w-3.5 h-3.5 rounded accent-primary"
                  />
                  Send email
                </label>
                <Button size="sm" onClick={handleGenerate} disabled={generateToken.isPending}>
                  {generateToken.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : sendEmail && email.trim() ? (
                    <><Send className="w-3.5 h-3.5 mr-1.5" />Send</>
                  ) : (
                    <><Link2 className="w-3.5 h-3.5 mr-1.5" />Generate link</>
                  )}
                </Button>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-[12px] text-muted hover:text-ink transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-1.5 text-[12px] font-medium text-primary hover:text-primary/80 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                Generate new portal link
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
