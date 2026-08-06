'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Lock } from 'lucide-react'

function BetaGate() {
  const router = useRouter()
  const search = useSearchParams()
  // Inside the gate the public landing page is irrelevant — send root arrivals
  // to sign-in (middleware bounces already-authed users on to /dashboard).
  const rawNext = search.get('next') || '/'
  const next = rawNext === '/' ? '/login' : rawNext

  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/beta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Incorrect password')
      }
      // Full navigation so middleware re-evaluates with the new cookie.
      window.location.href = next.startsWith('/') ? next : '/'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-page flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[400px]">
        <div className="flex items-center gap-2.5 mb-6 justify-center">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-serif text-white text-[16px] leading-none">V</div>
          <span className="font-semibold text-[16px] text-ink">VericonIQ</span>
        </div>
        <div className="bg-surface rounded-2xl border border-border shadow-sm p-8">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
            <Lock className="h-5 w-5 text-primary" />
          </div>
          <h1 className="font-serif text-[22px] text-ink">Private beta</h1>
          <p className="text-[14px] text-muted mt-2 leading-relaxed">
            VericonIQ isn&apos;t open to the public yet. Enter the beta password to continue, or{' '}
            <a href="/about" className="text-primary font-medium hover:underline">learn more about VericonIQ</a>.
          </p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
              required
              placeholder="Beta password"
              className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-[14px] text-ink focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {error && <p className="text-[13px] text-status-breach-text">{error}</p>}
            <button
              type="submit"
              disabled={loading || !password}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-white font-semibold px-4 py-2.5 text-[14px] hover:bg-primary-hover transition-colors disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Checking…' : 'Enter'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function BetaPage() {
  return (
    <Suspense fallback={null}>
      <BetaGate />
    </Suspense>
  )
}
