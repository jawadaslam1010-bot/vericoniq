'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Shield,
  ArrowRight,
  Check,
  Lock,
  Sparkles,
} from 'lucide-react'

const TEAL = '#0d9488'
const TEAL_DARK = '#0b837a'
const INK = '#1c1917'
const MUTED = '#78716c'
const SOFT = '#57534e'
const FAINT = '#a8a29e'
const BORDER = '#e8e4dc'
const SERIF = 'var(--font-dm-serif), Georgia, serif'
const MET = '#16a34a', MET_TX = '#0a6a3a', MET_BG = '#ecfdf3'
const RISK = '#d97706', RISK_TX = '#854d0e', RISK_BG = '#fffaeb'
const BREACH = '#dc2626', BREACH_TX = '#9b1c1c', BREACH_BG = '#fef2f2'

const STEPS = [
  { n: '1', title: 'Upload', text: 'Drop in any contract — MSAs, SOWs, schedules, amendments.' },
  { n: '2', title: 'AI extracts', text: 'Every KPI, credit formula and deadline, structured in minutes.' },
  { n: '3', title: 'Track', text: 'Vendors submit results through a secure portal. Everything is scored.' },
  { n: '4', title: 'Act', text: 'Health scores, breach alerts, credit claims and renewal warnings.' },
]

const CAPS = [
  { text: 'global search across vendors, contracts & KPIs', ai: true },
  { text: 'Multi-schedule & amendment hierarchy' },
  { text: 'Vendor health scores' },
  { text: 'Team roles & permissions' },
  { text: 'Immutable audit trail' },
  { text: 'Works for buyers and vendors' },
]

const SECURITY = [
  { title: 'Encrypted everywhere', text: 'In transit (TLS 1.2+) and at rest (AES-256).' },
  { title: 'Tenant isolation', text: 'Row-level security isolates every organisation at the database layer.' },
  { title: 'Enterprise-grade hosting', text: 'Secure cloud infrastructure with daily encrypted backups. Regional data residency available — including Australia (Sydney).' },
  { title: 'Role-based access', text: 'Admin, manager and viewer roles; portal links are scoped, time-limited and revocable.' },
  { title: 'Immutable audit trail', text: 'Every result, approval and lock recorded. Locked periods can’t be silently edited.' },
  { title: 'Your data stays yours', text: 'Never used to train AI models. Export or delete at any time.' },
]

// ─── Shared mockup chrome ────────────────────────────────────────────────────

function Frame({ url, children }: { url: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'white', border: `1px solid ${BORDER}`, boxShadow: '0 24px 60px rgba(20,24,22,0.12)' }}>
      <div className="flex items-center gap-1.5 px-4 py-2.5" style={{ background: '#f7f4ec', borderBottom: `1px solid ${BORDER}` }}>
        {['#e8837b', '#f2c94c', '#6fcf97'].map(c => (
          <span key={c} className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c }} />
        ))}
        <span className="ml-2 text-[11px] truncate" style={{ color: MUTED }}>{url}</span>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  )
}

function AiChip() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-bold tracking-wide align-[2px] ml-2"
      style={{ background: '#f0fdfa', color: TEAL_DARK, border: '1px solid #ccfbf1' }}
    >
      <Sparkles className="h-3 w-3" /> AI
    </span>
  )
}

// ─── Animated hero scorecard ─────────────────────────────────────────────────

function useCountUp(target: number, decimals: number, start: boolean) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!start) return
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target)
      return
    }
    const t0 = performance.now()
    const dur = 1100
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur)
      const e = 1 - Math.pow(1 - p, 3)
      setValue(parseFloat((target * e).toFixed(decimals)))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, decimals, start])
  return value.toFixed(decimals)
}

function HeroScorecard() {
  const [go, setGo] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setGo(true), 250)
    return () => clearTimeout(t)
  }, [])
  const health = useCountUp(94.2, 1, go)
  const breaches = useCountUp(3, 0, go)
  const credits = useCountUp(18.4, 1, go)

  const rows = [
    { name: 'Northwind Telecom', pct: 96, tone: MET, label: 'On track' },
    { name: 'Meridian Facilities', pct: 91, tone: MET, label: 'On track' },
    { name: 'CloudHarbour Ops', pct: 78, tone: RISK, label: 'At risk' },
    { name: 'SecureCorp Guarding', pct: 62, tone: BREACH, label: 'Breach' },
  ]

  return (
    <Frame url="app.vericoniq.com — vendor scorecard">
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { v: `${health}%`, l: 'PORTFOLIO HEALTH', c: MET_TX },
          { v: breaches, l: 'KPIS IN BREACH', c: BREACH_TX },
          { v: `$${credits}K`, l: 'CREDITS CLAIMABLE', c: RISK_TX },
        ].map(t => (
          <div key={t.l} className="rounded-lg px-3 py-2.5" style={{ background: '#fbfaf6', border: `1px solid ${BORDER}` }}>
            <div className="text-[19px] leading-none tabular-nums" style={{ fontFamily: SERIF, color: t.c }}>{t.v}</div>
            <div className="mt-1.5 text-[8px] font-bold tracking-[0.12em]" style={{ color: MUTED }}>{t.l}</div>
          </div>
        ))}
      </div>
      {rows.map(r => (
        <div key={r.name} className="flex items-center gap-3 rounded-lg px-3 py-2.5 mt-2" style={{ border: `1px solid ${BORDER}` }}>
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: r.tone }} />
          <span className="flex-1 text-[12px] font-semibold truncate" style={{ color: INK }}>{r.name}</span>
          <span className="hidden sm:block w-24 h-1.5 rounded-full overflow-hidden shrink-0" style={{ background: '#efece3' }}>
            <span
              className="block h-full rounded-full"
              style={{ width: go ? `${r.pct}%` : '0%', background: r.tone, transition: 'width 1.1s cubic-bezier(.2,.7,.3,1)' }}
            />
          </span>
          <span className="text-[12px] font-bold tabular-nums" style={{ color: INK }}>{r.pct}%</span>
          <span className="hidden sm:block text-[10px] w-13 text-right" style={{ color: MUTED, width: 52 }}>{r.label}</span>
        </div>
      ))}
    </Frame>
  )
}

// ─── Feature showcase mockups ────────────────────────────────────────────────

function ExtractionMock() {
  const rows = [
    ['Network availability', '≥ 99.95%', '5% MRC', 'Sch 3, §2.1'],
    ['P1 incident response', '≤ 15 min', '2% MRC', 'Sch 3, §4.2'],
    ['Change success rate', '≥ 98%', '—', 'Sch 4, §1.8'],
    ['Report delivery', 'Day 5', '1% MRC', 'Sch 6, §2.2'],
  ]
  return (
    <Frame url="app.vericoniq.com/contracts/extraction">
      <div className="text-[13px] font-bold mb-2.5" style={{ color: INK }}>Northwind Telecom MSA — extraction complete</div>
      <div className="flex flex-wrap gap-2 mb-3">
        <span className="rounded-full px-2.5 py-1 text-[10.5px] font-bold" style={{ background: '#ccfbf1', color: TEAL_DARK }}>47 KPIs found</span>
        <span className="rounded-full px-2.5 py-1 text-[10.5px] font-bold" style={{ background: '#eff6ff', color: '#1e40af' }}>12 obligations</span>
        <span className="rounded-full px-2.5 py-1 text-[10.5px] font-bold" style={{ background: RISK_BG, color: RISK_TX }}>6 credit formulas</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11.5px]" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['KPI', 'TARGET', 'CREDIT', 'SOURCE'].map(h => (
                <th key={h} className="text-left px-2.5 py-1.5 text-[9px] tracking-[0.1em]" style={{ color: MUTED, background: '#f7f4ec' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r[0]} style={{ background: i % 2 ? '#fbfaf6' : 'white' }}>
                <td className="px-2.5 py-2" style={{ color: INK, borderBottom: '1px solid #f3efe5' }}>{r[0]}</td>
                <td className="px-2.5 py-2 font-bold" style={{ color: TEAL_DARK, borderBottom: '1px solid #f3efe5' }}>{r[1]}</td>
                <td className="px-2.5 py-2" style={{ color: SOFT, borderBottom: '1px solid #f3efe5' }}>{r[2]}</td>
                <td className="px-2.5 py-2" style={{ color: MUTED, borderBottom: '1px solid #f3efe5' }}>{r[3]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Frame>
  )
}

function PortalMock() {
  const rows: Array<[string, string, string, string, string]> = [
    ['Service availability', '99.97%', 'Met', MET_BG, MET_TX],
    ['Backup success rate', '96.1%', 'Not met', BREACH_BG, BREACH_TX],
    ['Patch compliance', '—', 'Exemption requested', RISK_BG, RISK_TX],
  ]
  return (
    <Frame url="vericoniq.com/portal/june-2026">
      <div className="text-[13px] font-bold" style={{ color: INK }}>June 2026 submission — CloudHarbour Ops</div>
      <div className="h-2 rounded-full overflow-hidden my-2.5" style={{ background: '#efece3' }}>
        <div className="h-full rounded-full" style={{ width: '80%', background: TEAL }} />
      </div>
      <div className="text-[10px] mb-1" style={{ color: MUTED }}>8 of 10 KPIs completed</div>
      {rows.map(r => (
        <div key={r[0]} className="flex items-center justify-between rounded-lg px-3 py-2.5 mt-2" style={{ border: `1px solid ${BORDER}` }}>
          <div>
            <div className="text-[12px] font-bold" style={{ color: INK }}>{r[0]}</div>
            <div className="text-[10.5px]" style={{ color: MUTED }}>Reported: {r[1]}</div>
          </div>
          <span className="rounded-full px-2.5 py-1 text-[10px] font-bold shrink-0" style={{ background: r[3], color: r[4] }}>{r[2]}</span>
        </div>
      ))}
      <div className="text-right mt-3">
        <span className="inline-block rounded-lg px-3.5 py-2 text-[11px] font-bold text-white" style={{ background: TEAL }}>Submit to contract manager</span>
      </div>
    </Frame>
  )
}

function CreditsMock() {
  const rows = [
    ['Guard attendance', '97.2% vs ≥ 99%', '4% of monthly fee', '$3,840'],
    ['Incident reporting', '18 hrs vs ≤ 12 hrs', '2% of monthly fee', '$1,920'],
    ['Site inspections', '2 missed', '$500 per missed', '$1,000'],
  ]
  return (
    <Frame url="app.vericoniq.com/credits">
      <div className="text-[13px] font-bold mb-2.5" style={{ color: INK }}>Credit calculation — SecureCorp Guarding, June 2026</div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11.5px]" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['BREACHED KPI', 'RESULT', 'FORMULA', 'CREDIT'].map(h => (
                <th key={h} className="text-left px-2.5 py-1.5 text-[9px] tracking-[0.1em]" style={{ color: MUTED, background: '#f7f4ec' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r[0]} style={{ background: i % 2 ? '#fbfaf6' : 'white' }}>
                <td className="px-2.5 py-2 font-semibold" style={{ color: INK, borderBottom: '1px solid #f3efe5' }}>{r[0]}</td>
                <td className="px-2.5 py-2" style={{ color: BREACH_TX, borderBottom: '1px solid #f3efe5' }}>{r[1]}</td>
                <td className="px-2.5 py-2" style={{ color: MUTED, borderBottom: '1px solid #f3efe5' }}>{r[2]}</td>
                <td className="px-2.5 py-2 font-bold" style={{ color: INK, borderBottom: '1px solid #f3efe5' }}>{r[3]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between rounded-lg px-4 py-3 mt-3" style={{ background: '#f0fdfa', border: '1px solid #ccfbf1' }}>
        <span className="text-[12px] font-bold" style={{ color: TEAL_DARK }}>Total claimable this period</span>
        <span className="text-[22px]" style={{ fontFamily: SERIF, color: TEAL_DARK }}>$6,760</span>
      </div>
      <div className="text-[10px] italic mt-2" style={{ color: MUTED }}>Capped at 8% of monthly fee per Schedule 5, §3.4 — cap not reached.</div>
    </Frame>
  )
}

function RenewalsMock() {
  const rows: Array<[string, string, string, string, string, string, string]> = [
    ['SecureCorp Guarding', 'Notice deadline', 'Health 62% — consider exit', '14 days', BREACH, BREACH_BG, BREACH_TX],
    ['CloudHarbour Ops', 'Auto-renewal window', 'Health 78% — renegotiate SLAs', '38 days', RISK, RISK_BG, RISK_TX],
    ['Meridian Facilities', 'Contract expiry', 'Health 91% — renew on terms', '87 days', MET, MET_BG, MET_TX],
  ]
  return (
    <Frame url="app.vericoniq.com/renewals">
      <div className="text-[13px] font-bold mb-2.5" style={{ color: INK }}>Upcoming deadlines</div>
      {rows.map(r => (
        <div key={r[0]} className="flex items-start gap-2.5 rounded-lg px-3 py-2.5 mt-2" style={{ border: `1px solid ${BORDER}` }}>
          <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: r[4] }} />
          <div className="min-w-0">
            <div className="text-[12px] font-bold" style={{ color: INK }}>{r[0]}</div>
            <div className="text-[10.5px]" style={{ color: MUTED }}>{r[1]}</div>
            <div className="text-[10.5px] italic" style={{ color: SOFT }}>{r[2]}</div>
          </div>
          <span className="ml-auto rounded-full px-2.5 py-1 text-[10px] font-bold shrink-0" style={{ background: r[5], color: r[6] }}>{r[3]}</span>
        </div>
      ))}
    </Frame>
  )
}

// ─── Feature showcase section ────────────────────────────────────────────────

function Showcase({ flip, title, ai, copy, ticks, mock }: {
  flip?: boolean
  title: string
  ai?: boolean
  copy: string
  ticks: string[]
  mock: React.ReactNode
}) {
  return (
    <div className={`grid lg:grid-cols-2 gap-10 lg:gap-14 items-center py-10`}>
      <div className={flip ? 'lg:order-2' : ''}>
        <h3 className="text-[1.55rem] leading-tight" style={{ fontFamily: SERIF, color: INK }}>
          {title}{ai && <AiChip />}
        </h3>
        <p className="mt-3.5 text-[15px]" style={{ color: MUTED }}>{copy}</p>
        <ul className="mt-4 space-y-2.5">
          {ticks.map(t => (
            <li key={t} className="flex gap-2.5 text-sm" style={{ color: SOFT }}>
              <Check className="h-4 w-4 shrink-0 mt-0.5" style={{ color: TEAL }} />{t}
            </li>
          ))}
        </ul>
      </div>
      <div className={flip ? 'lg:order-1' : ''}>{mock}</div>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [form, setForm] = useState({ name: '', email: '', role: '', message: '' })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      setStatus('success')
      setForm({ name: '', email: '', role: '', message: '' })
    } catch {
      setStatus('error')
    }
  }

  const inputStyle = { background: 'white', border: `1px solid ${BORDER}`, color: INK } as const

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#fafaf8', color: INK }}>

      {/* Nav */}
      <nav className="sticky top-0 z-40" style={{ backgroundColor: 'rgba(250,250,248,0.92)', backdropFilter: 'blur(8px)', borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: TEAL }}>
              <span className="text-white font-bold text-sm">V</span>
            </div>
            <span className="font-bold text-lg">VericonIQ</span>
          </div>
          <div className="hidden md:flex items-center gap-7 text-sm" style={{ color: SOFT }}>
            <a href="#how" className="hover:opacity-70 transition-opacity">How it works</a>
            <a href="#features" className="hover:opacity-70 transition-opacity">Features</a>
            <a href="#security" className="hover:opacity-70 transition-opacity">Security</a>
            <a href="#pricing" className="hover:opacity-70 transition-opacity">Pricing</a>
            <Link href="/about" className="hover:opacity-70 transition-opacity">About</Link>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            style={{ backgroundColor: TEAL }}
          >
            <Lock className="h-3.5 w-3.5" />
            Sign in
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-12">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
              style={{ background: '#f0fdfa', color: TEAL, border: '1px solid #ccfbf1' }}
            >
              Free for 3 months — no credit card required
            </span>
            <h1
              className="mt-5 font-normal"
              style={{ fontSize: 'clamp(2.3rem, 4.8vw, 3.4rem)', lineHeight: 1.14, fontFamily: SERIF }}
            >
              Your contracts promise performance.{' '}
              <span style={{ color: TEAL }}>Start managing them.</span>
            </h1>
            <p className="mt-5 text-[17px] font-semibold" style={{ color: INK }}>
              AI-enabled extraction <span style={{ color: TEAL }}>·</span> Live scorecards <span style={{ color: TEAL }}>·</span> Total lifecycle control
            </p>
            <p className="mt-3 text-[15.5px] leading-relaxed max-w-lg" style={{ color: MUTED }}>
              VericonIQ reads every schedule and amendment with AI, scores your vendors against what
              was actually signed, and flags the service credits and renewal deadlines everyone else misses.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-xl text-white font-semibold px-6 py-3.5 text-sm hover:opacity-90 transition-opacity"
                style={{ backgroundColor: TEAL }}
              >
                Start free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#how"
                className="inline-flex items-center justify-center gap-2 rounded-xl font-medium px-6 py-3.5 text-sm transition-colors"
                style={{ border: `1px solid ${BORDER}`, color: SOFT }}
              >
                See how it works
              </a>
            </div>
            <p className="mt-4 text-xs" style={{ color: FAINT }}>
              Set up in minutes · Cancel anytime · Built in Australia
            </p>
          </div>
          <HeroScorecard />
        </div>
      </section>

      {/* Proof stats */}
      <section className="py-12" style={{ borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, background: '#f5f5f0' }}>
        <div className="max-w-6xl mx-auto px-6 grid sm:grid-cols-3 gap-8 text-center">
          {[
            { big: '9%', text: 'of annual revenue leaks through poor contract management¹' },
            { big: '60–80%', text: 'of eligible SLA service credits are never claimed²' },
            { big: '69%', text: 'of software contracts auto-renew — most tracked manually³' },
          ].map(s => (
            <div key={s.big}>
              <div style={{ fontFamily: SERIF, fontSize: '2.6rem', color: TEAL }}>{s.big}</div>
              <p className="mt-1 text-sm max-w-[260px] mx-auto" style={{ color: MUTED }}>{s.text}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-[11px]" style={{ color: FAINT }}>
          1 World Commerce &amp; Contracting research &nbsp;·&nbsp; 2 Enterprise SLA benchmarks &nbsp;·&nbsp; 3 Contract-renewal industry data
        </p>
      </section>

      {/* How it works */}
      <section id="how" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: TEAL }}>How it works</span>
          <h2 className="mt-3 text-3xl font-normal" style={{ fontFamily: SERIF }}>
            From signature to scorecard in four steps
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((s, i) => (
            <div key={s.n} className="relative rounded-xl p-6" style={{ background: 'white', border: `1px solid ${BORDER}` }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm mb-4" style={{ background: TEAL }}>
                {s.n}
              </div>
              <h3 className="font-semibold text-[15px] mb-1.5">{s.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: MUTED }}>{s.text}</p>
              {i < STEPS.length - 1 && (
                <ArrowRight className="hidden lg:block absolute top-1/2 -right-4 h-4 w-4 -translate-y-1/2" style={{ color: '#d6d3cd' }} />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Feature showcases */}
      <section id="features" className="py-16" style={{ backgroundColor: '#f5f5f0', borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-6">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: TEAL }}>The platform</span>
            <h2 className="mt-3 text-3xl font-normal" style={{ fontFamily: SERIF }}>
              See it the way your team will use it
            </h2>
          </div>

          <Showcase
            title="Upload a contract. Get a living KPI register."
            ai
            copy="AI reads every schedule and amendment, then extracts KPIs, targets, service-credit formulas and obligations — each one linked back to the exact clause."
            ticks={[
              'Handles 80-page contracts with dozens of schedules',
              'Every extraction traceable to its source clause',
              'You review and approve before anything goes live',
            ]}
            mock={<ExtractionMock />}
          />

          <Showcase
            flip
            title="Vendors report results. No logins. No spreadsheets."
            copy="Send a secure magic link and vendors submit their KPI results in minutes. You review, rule on exemptions, and lock the period — everyone is notified automatically."
            ticks={[
              'One-click magic links — no vendor accounts needed',
              'Evidence and exemption requests attached per KPI',
              'Locked periods become an immutable record',
            ]}
            mock={<PortalMock />}
          />

          <Showcase
            title="Stop leaving credits on the table."
            copy="When a KPI is breached, VericonIQ applies the exact credit formula from your contract — caps, tiers and carve-outs included — and produces a claim you can send to the vendor."
            ticks={[
              'Formulas extracted straight from the contract',
              'Caps and cumulative limits applied automatically',
              'Claim-ready summary with clause references',
            ]}
            mock={<CreditsMock />}
          />

          <Showcase
            flip
            title="Never miss a notice window again."
            copy="Every notice period, expiry and auto-renewal window is extracted at upload and tracked forever. Walk into every renewal with the full performance history in hand."
            ticks={[
              'Automatic alerts at 90, 60 and 30 days',
              'Renegotiate armed with breach and credit history',
              'No more silent auto-renewals of poor performers',
            ]}
            mock={<RenewalsMock />}
          />

          {/* Capability strip */}
          <div className="mt-8 flex flex-wrap justify-center gap-2.5">
            {CAPS.map(c => (
              <span key={c.text} className="rounded-full px-4 py-2 text-[13px]" style={{ border: `1px solid ${BORDER}`, background: 'white', color: SOFT }}>
                {c.ai && <strong style={{ color: TEAL_DARK }}>✦ AI </strong>}{c.text}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: TEAL }}>Security</span>
          <h2 className="mt-3 text-3xl font-normal" style={{ fontFamily: SERIF }}>
            Your contracts are commercially sensitive. We treat them that way.
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {SECURITY.map(s => (
            <div key={s.title} className="rounded-xl p-5" style={{ background: 'white', border: `1px solid ${BORDER}` }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: '#f0fdfa' }}>
                <Shield className="h-4 w-4" style={{ color: TEAL }} />
              </div>
              <h3 className="font-semibold text-sm mb-1.5">{s.title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: MUTED }}>{s.text}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-xs" style={{ color: FAINT }}>
          Questions about security or compliance? <a href="mailto:jawad@mypropiq.com.au?subject=VericonIQ%20Security" className="underline underline-offset-2" style={{ color: TEAL }}>Talk to us</a> — Enterprise plans include private cloud or on-premises deployment.
        </p>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20" style={{ backgroundColor: '#f5f5f0', borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: TEAL }}>Pricing</span>
            <h2 className="mt-3 text-3xl font-normal" style={{ fontFamily: SERIF }}>
              Simple pricing that scales with your portfolio
            </h2>
            <p className="mt-3 text-sm" style={{ color: MUTED }}>All prices in AUD. Cancel anytime.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
            {/* Free */}
            <div className="rounded-2xl p-6 flex flex-col" style={{ background: 'white', border: `1px solid ${BORDER}` }}>
              <h3 className="font-semibold">Free</h3>
              <div className="mt-3"><span style={{ fontFamily: SERIF, fontSize: '2.2rem' }}>$0</span></div>
              <p className="mt-1 text-xs" style={{ color: MUTED }}>3-month evaluation</p>
              <ul className="mt-5 space-y-2.5 text-sm flex-1" style={{ color: SOFT }}>
                {['2 vendors, 3 contracts', 'Full AI extraction', 'Every feature, small scale', '100 MB storage'].map(x => (
                  <li key={x} className="flex gap-2"><Check className="h-4 w-4 shrink-0" style={{ color: TEAL }} />{x}</li>
                ))}
              </ul>
              <Link href="/signup" className="mt-6 inline-flex justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition-colors" style={{ border: `1px solid ${BORDER}`, color: SOFT }}>
                Get started
              </Link>
            </div>
            {/* Essentials */}
            <div className="rounded-2xl p-6 flex flex-col" style={{ background: 'white', border: `1px solid ${BORDER}` }}>
              <h3 className="font-semibold">Essentials</h3>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span style={{ fontFamily: SERIF, fontSize: '2.2rem' }}>$99</span>
                <span className="text-sm" style={{ color: MUTED }}>/month</span>
              </div>
              <p className="mt-1 text-xs" style={{ color: MUTED }}>or $990/year — two months free</p>
              <ul className="mt-5 space-y-2.5 text-sm flex-1" style={{ color: SOFT }}>
                {['5 vendors, 15 contracts', 'AI extraction & SLA tracking', 'Scorecards & renewal alerts', '0.5 GB storage'].map(x => (
                  <li key={x} className="flex gap-2"><Check className="h-4 w-4 shrink-0" style={{ color: TEAL }} />{x}</li>
                ))}
              </ul>
              <Link href="/signup" className="mt-6 inline-flex justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition-colors" style={{ border: `1px solid ${BORDER}`, color: SOFT }}>
                Get started
              </Link>
            </div>
            {/* Professional */}
            <div className="rounded-2xl p-6 flex flex-col relative" style={{ background: 'white', border: `2px solid ${TEAL}`, boxShadow: '0 12px 40px rgba(13,148,136,0.12)' }}>
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[11px] font-bold text-white whitespace-nowrap" style={{ background: TEAL }}>
                MOST POPULAR
              </span>
              <h3 className="font-semibold">Professional</h3>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span style={{ fontFamily: SERIF, fontSize: '2.2rem' }}>$299</span>
                <span className="text-sm" style={{ color: MUTED }}>/month</span>
              </div>
              <p className="mt-1 text-xs" style={{ color: MUTED }}>or $2,990/year — two months free</p>
              <ul className="mt-5 space-y-2.5 text-sm flex-1" style={{ color: SOFT }}>
                {['25 vendors, 100 contracts', 'Everything in Essentials', 'Vendor submission portal', 'Service credit recovery', 'Team access & roles', '2 GB storage'].map(x => (
                  <li key={x} className="flex gap-2"><Check className="h-4 w-4 shrink-0" style={{ color: TEAL }} />{x}</li>
                ))}
              </ul>
              <Link href="/signup" className="mt-6 inline-flex justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity" style={{ background: TEAL }}>
                Start free, upgrade anytime
              </Link>
            </div>
            {/* Enterprise */}
            <div className="rounded-2xl p-6 flex flex-col" style={{ background: 'white', border: `1px solid ${BORDER}` }}>
              <h3 className="font-semibold">Enterprise</h3>
              <div className="mt-3"><span style={{ fontFamily: SERIF, fontSize: '2.2rem' }}>Custom</span></div>
              <p className="mt-1 text-xs" style={{ color: MUTED }}>For large portfolios</p>
              <ul className="mt-5 space-y-2.5 text-sm flex-1" style={{ color: SOFT }}>
                {['Unlimited vendors & contracts', 'Unlimited storage', 'Private cloud or on-premises deployment', 'Custom onboarding & priority support'].map(x => (
                  <li key={x} className="flex gap-2"><Check className="h-4 w-4 shrink-0" style={{ color: TEAL }} />{x}</li>
                ))}
              </ul>
              <a href="mailto:jawad@mypropiq.com.au?subject=VericonIQ%20Enterprise" className="mt-6 inline-flex justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition-colors" style={{ border: `1px solid ${BORDER}`, color: SOFT }}>
                Talk to us
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Guided start / demo request */}
      <section id="request" className="py-20" style={{ background: '#10312d' }}>
        <div className="max-w-2xl mx-auto px-6">
          <div className="text-center mb-10">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#5eead4' }}>Prefer a guided start?</span>
            <h2 className="mt-3 text-3xl font-normal text-white" style={{ fontFamily: SERIF }}>
              Book a walkthrough with the founder
            </h2>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: '#b8c4c1' }}>
              Tell us about your contract portfolio and we&apos;ll walk you through VericonIQ on one of
              your own contracts — or just{' '}
              <Link href="/signup" className="underline underline-offset-2" style={{ color: 'white' }}>start free now</Link>{' '}
              and explore it yourself.
            </p>
          </div>

          {status === 'success' ? (
            <div className="rounded-2xl p-10 text-center" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(94,234,212,0.15)' }}>
                <Check className="h-6 w-6" style={{ color: '#5eead4' }} />
              </div>
              <h3 className="font-bold text-lg text-white mb-2">Request received</h3>
              <p className="text-sm" style={{ color: '#b8c4c1' }}>We&apos;ll be in touch shortly to set up your walkthrough.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="rounded-2xl p-8 space-y-4" style={{ background: 'white' }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Name</label>
                  <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full rounded-lg px-3.5 py-2.5 text-sm focus:outline-none" style={inputStyle} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Work email</label>
                  <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full rounded-lg px-3.5 py-2.5 text-sm focus:outline-none" style={inputStyle} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Your role</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full rounded-lg px-3.5 py-2.5 text-sm focus:outline-none" style={inputStyle}>
                  <option value="">Select your role...</option>
                  <option value="vendor_manager">Procurement / Contracts Manager</option>
                  <option value="operations">Operations / Service Delivery</option>
                  <option value="legal">Legal / Compliance</option>
                  <option value="executive">Executive / C-Suite</option>
                  <option value="vendor_side">Vendor / Service Provider</option>
                  <option value="consultant">Consultant / Advisor</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  What does your contract portfolio look like? <span style={{ color: FAINT }}>(optional)</span>
                </label>
                <textarea rows={3} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="e.g. 30 vendor contracts across IT and facilities, no visibility of who is meeting their SLAs…"
                  className="w-full rounded-lg px-3.5 py-2.5 text-sm focus:outline-none resize-none" style={inputStyle} />
              </div>
              <button type="submit" disabled={status === 'loading'}
                className="w-full rounded-xl text-white font-semibold px-6 py-3 text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
                style={{ backgroundColor: TEAL }}>
                {status === 'loading' ? 'Sending…' : 'Request a walkthrough'}
              </button>
              {status === 'error' && (
                <p className="text-sm text-center" style={{ color: BREACH }}>Something went wrong — please try again.</p>
              )}
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10" style={{ borderTop: `1px solid ${BORDER}` }}>
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: TEAL }}>
              <span className="text-white font-bold text-[10px]">V</span>
            </div>
            <span className="text-sm font-semibold">VericonIQ</span>
            <span className="text-xs ml-2" style={{ color: FAINT }}>© {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-6 text-xs" style={{ color: MUTED }}>
            <Link href="/about" className="hover:opacity-70">About</Link>
            <a href="#pricing" className="hover:opacity-70">Pricing</a>
            <Link href="/login" className="hover:opacity-70">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
