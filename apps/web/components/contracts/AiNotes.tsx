'use client'
import { useState } from 'react'

const PREVIEW_LENGTH = 400

export function AiNotes({ notes }: { notes: string }) {
  const [expanded, setExpanded] = useState(false)
  const isLong = notes.length > PREVIEW_LENGTH

  return (
    <div className="bg-surface border border-border rounded-lg p-5">
      <h3 className="text-[12px] font-bold uppercase tracking-eyebrow text-muted mb-2">AI notes</h3>
      <p className="text-[13px] text-ink-soft leading-relaxed italic">
        {isLong && !expanded ? notes.slice(0, PREVIEW_LENGTH) + '…' : notes}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="mt-2 text-[12px] font-medium text-primary hover:text-primary-hover transition-colors"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  )
}
