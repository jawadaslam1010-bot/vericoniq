export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-page">
      {/* Minimal header */}
      <header className="border-b border-border bg-surface px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
            <span className="text-white font-bold text-[11px]">V</span>
          </div>
          <span className="font-semibold text-[14px] text-ink">VericonIQ</span>
          <span className="text-faint text-[13px] ml-1">· Vendor Submission Portal</span>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
