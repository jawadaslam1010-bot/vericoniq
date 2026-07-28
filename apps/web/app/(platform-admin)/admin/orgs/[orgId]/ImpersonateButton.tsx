'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserRound, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

type Props = {
  userId: string
  userEmail: string
  orgName: string
}

export function ImpersonateButton({ userId, userEmail, orgName }: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleImpersonate = async () => {
    const confirmed = window.confirm(
      `View app as "${userEmail}" (${orgName})?\n\nYou'll see their dashboard in read-only mode. This action is logged.`
    )
    if (!confirmed) return

    setLoading(true)
    try {
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to impersonate')
      }
      toast.success(`Viewing as ${userEmail}`)
      router.push('/vendors')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed')
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleImpersonate}
      disabled={loading}
      title={`View app as ${userEmail}`}
      className="p-1.5 rounded-md text-white/20 hover:text-violet-400 hover:bg-violet-400/10 transition-colors disabled:opacity-40"
    >
      {loading
        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
        : <UserRound className="w-3.5 h-3.5" />
      }
    </button>
  )
}
