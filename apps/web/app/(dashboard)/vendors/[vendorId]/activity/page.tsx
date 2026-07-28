export const dynamic = 'force-dynamic'

import { Activity } from 'lucide-react'

export default function ActivityPage() {
  return <ComingSoon icon={Activity} title="Activity" description="A full audit log of changes, extractions, and submissions for this vendor will appear here." />
}

function ComingSoon({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      <p className="text-[13px] text-muted mt-1.5 max-w-sm">{description}</p>
      <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11.5px] font-semibold text-primary">
        Coming soon
      </span>
    </div>
  )
}
