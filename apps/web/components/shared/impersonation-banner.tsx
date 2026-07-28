'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, X, Loader2 } from 'lucide-react'

type Props = {
  viewingAs: string  // name or email of the impersonated user
  orgName: string
}

export function ImpersonationBanner({ viewingAs, orgName }: Props) {
  const [exiting, setExiting] = useState(false)
  const router = useRouter()

  const handleExit = async () => {
    setExiting(true)
    try {
      await fetch('/api/admin/impersonate', { method: 'DELETE' })
      router.push('/admin')
    } catch {
      setExiting(false)
    }
  }

  return (
    <div className="w-full bg-violet-600 px-4 py-2 flex items-center justify-between text-white text-[12px]">
      <div className="flex items-center gap-2">
        <Shield className="w-3.5 h-3.5 text-violet-200 shrink-0" />
        <span>
          <span className="font-semibold text-violet-100">Platform admin view</span>
          <span className="text-violet-200 ml-1.5">— viewing as {viewingAs} · {orgName}</span>
        </span>
        <span className="ml-2 px-1.5 py-0.5 rounded bg-violet-500/60 text-violet-100 font-medium">
          Read-only
        </span>
      </div>
      <button
        onClick={handleExit}
        disabled={exiting}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-violet-500/60 hover:bg-violet-500 text-violet-100 font-medium transition-colors disabled:opacity-60"
      >
        {exiting
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <X className="w-3.5 h-3.5" />
        }
        Exit
      </button>
    </div>
  )
}
