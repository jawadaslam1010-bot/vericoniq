import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { FileSearch } from 'lucide-react'

export default function DashboardNotFound() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="text-center max-w-md">
        <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileSearch className="w-7 h-7 text-slate-500" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Not found</h2>
        <p className="text-sm text-slate-500 mb-6">
          This item doesn't exist or you don't have access to it.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button size="sm" asChild>
            <Link href="/vendors">Back to vendors</Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
