'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export function AcceptForm({ token, email }: { token: string; email: string }) {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 12) {
      setError('Password must be at least 12 characters')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, fullName, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to accept invitation')
      setDone(true)
      setTimeout(() => router.push('/login'), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="text-center py-4">
        <p className="text-[14px] font-medium text-ink">Account created</p>
        <p className="text-[13px] text-muted mt-1">Redirecting you to sign in…</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-[13px] font-medium text-ink-soft mb-1.5">Email</label>
        <input
          type="email"
          value={email}
          disabled
          className="w-full rounded-lg border border-border bg-hover px-3.5 py-2.5 text-[14px] text-muted"
        />
      </div>
      <div>
        <label className="block text-[13px] font-medium text-ink-soft mb-1.5">Full name</label>
        <input
          type="text"
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          required
          minLength={2}
          placeholder="Jane Smith"
          className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-[14px] text-ink focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>
      <div>
        <label className="block text-[13px] font-medium text-ink-soft mb-1.5">Password</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          minLength={12}
          placeholder="At least 12 characters"
          className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-[14px] text-ink focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {error && <p className="text-[13px] text-status-breach-text">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-white font-semibold px-4 py-2.5 text-[14px] hover:bg-primary-hover transition-colors disabled:opacity-60"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading ? 'Creating account…' : 'Accept invitation'}
      </button>
    </form>
  )
}
