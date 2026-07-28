export const dynamic = 'force-dynamic'

import { AlertTriangle } from 'lucide-react'

export default function BreachesPage() {
  return <ComingSoon icon={AlertTriangle} title="Breaches" description="Open SLA breaches and service credit claims will be tracked and calculated here." />
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
