'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Brain,
  BarChart2,
  Bell,
  Shield,
  Users,
  Layers,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Check,
  Lock,
} from 'lucide-react'

const TEAL = '#0d9488'
const INK = '#1c1917'
const MUTED = '#78716c'
const SOFT = '#57534e'
const BORDER = '#e8e4dc'
const SERIF = 'var(--font-dm-serif), Georgia, serif'

const FEATURES = [
  { icon: Brain, title: 'AI Contract Extraction', description: 'Upload your contracts and AI extracts every KPI, obligation and service credit automatically.' },
  { icon: Layers, title: 'Multi-Document Support', description: 'Handles complex contracts with dozens of schedules and amendments — hierarchy managed automatically.' },
  { icon: TrendingUp, title: 'SLA Performance Tracking', description: 'Track actual performance against contracted targets period by period.' },
  { icon: Shield, title: 'Service Credit Calculator', description: 'Credits calculated automatically based on the exact formula in your contract.' },
  { icon: BarChart2, title: 'Vendor Scorecards', description: 'Weighted health scores for every vendor across all active contracts.' },
  { icon: Bell, title: 'Renewal & Deadline Alerts', description: 'Never miss a notice period or auto-renewal window again.' },
  { icon: Users, title: 'Works for Both Sides', description: 'Built for buyers managing vendors AND vendors managing their client obligations.' },
  { icon: CheckCircle, title: 'Multi-Sector & Global', description: 'Telco, IT, cloud, facilities, construction — if it has a contract, VericonIQ handles it.' },
]

const STEPS = [
  { n: '1', title: 'Upload', text: 'Drop in any contract — MSAs, SOWs, schedules, amendments.' },
  { n: '2', title: 'AI extracts', text: 'Every KPI, credit formula and deadline, structured in minutes.' },
  { n: '3', title: 'Track', text: 'Vendors submit results through a secure portal. Everything is scored.' },
  { n: '4', title: 'Act', text: 'Health scores, breach alerts, credit claims and renewal warnings.' },
]

function MockDashboard() {
  const rows = [
    { name: 'Telstra Managed Services', pct: 96, tone: '#16a34a', label: 'On track' },
    { name: 'CBRE Facilities', pct: 91, tone: '#16a34a', label: 'On track' },
    { name: 'Datacom Cloud Ops', pct: 78, tone: '#d97706', label: 'At risk' },
    { name: 'SecureCorp Guarding', pct: 62, tone: '#dc2626', label: 'Breach' },
  ]
  return (
    <div
      className="rounded-2xl overflow-hidden text-left"
      style={{ background: 'white', border: `1px solid ${BORDER}`, boxShadow: '0 24px 60px rgba(20,24,22,0.12)' }}
    >
      <div className="flex items-center gap-1.5 px-4 py-2.5" style={{ background: '#f7f4ec', borderBottom: `1px solid ${BORDER}` }}>
        {['#e8837b', '#f2c94c', '#6fcf97'].map(c => (
          <span key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
        ))}
        <span className="ml-3 text-[11px]" style={{ color: MUTED }}>app.vericoniq.com — vendor scorecard</span>
      </div>
      <div className="p-5">
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { v: '94.2%', l: 'PORTFOLIO HEALTH', c: '#0a6a3a' },
            { v: '3', l: 'KPIS IN BREACH', c: '#9b1c1c' },
            { v: '$18.4K', l: 'CREDITS CLAIMABLE', c: '#854d0e' },
          ].map(t => (
            <div key={t.l} className="rounded-lg px-3.5 py-3" style={{ background: '#fbfaf6', border: `1px solid ${BORDER}` }}>
              <div className="text-[20px] leading-none" style={{ fontFamily: SERIF, color: t.c }}>{t.v}</div>
              <div className="mt-1.5 text-[8.5px] font-bold tracking-widest" style={{ color: MUTED }}>{t.l}</div>
            </div>
          ))}
        </div>
        {rows.map(r => (
          <div key={r.name} className="flex items-center gap-3 rounded-lg px-3.5 py-2.5 mb-2 last:mb-0" style={{ border: `1px solid ${BORDER}` }}>
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: r.tone }} />
            <span className="flex-1 text-[12px] font-semibold truncate" style={{ color: INK }}>{r.name}</span>
            <span className="hidden sm:block w-24 h-1.5 rounded-full overflow-hidden" style={{ background: '#efece3' }}>
              <span className="block h-full rounded-full" style={{ width: `${r.pct}%`, background: r.tone }} />
            </span>
            <span className="text-[12px] font-bold tabular-nums" style={{ color: INK }}>{r.pct}%</span>
            <span className="hidden sm:block text-[10.5px] w-14 text-right" style={{ color: MUTED }}>{r.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

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

  const inputStyle = {
    background: 'white',
    border: `1px solid ${BORDER}`,
    color: INK,
  } as const

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
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
              style={{ backgroundColor: TEAL }}
            >
              <Lock className="h-3.5 w-3.5" />
              Sign in
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-10">
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
              style={{ fontSize: 'clamp(2.4rem, 5vw, 3.6rem)', lineHeight: 1.1, fontFamily: SERIF }}
            >
              Your contracts promise performance.{' '}
              <span style={{ color: TEAL }}>Start checking.</span>
            </h1>
            <p className="mt-5 text-lg leading-relaxed max-w-lg" style={{ color: MUTED }}>
              VericonIQ reads your vendor contracts with AI, extracts every KPI, obligation and
              service-credit formula, then tracks real performance against them — so nothing stays
              buried in schedule 6, and no credit goes unclaimed.
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
            <p className="mt-4 text-xs" style={{ color: '#a8a29e' }}>
              Set up in minutes · No credit card for the free tier · Built in Australia
            </p>
          </div>
          <MockDashboard />
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
        <p className="mt-6 text-center text-[11px]" style={{ color: '#a8a29e' }}>
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

      {/* Features */}
      <section id="features" className="py-20" style={{ backgroundColor: '#f5f5f0', borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: TEAL }}>The platform</span>
            <h2 className="mt-3 text-3xl font-normal" style={{ fontFamily: SERIF }}>
              Everything your contracts team needs
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map(f => (
              <div key={f.title} className="rounded-xl p-5 transition-all hover:shadow-sm" style={{ backgroundColor: 'white', border: `1px solid ${BORDER}` }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: '#f0fdfa' }}>
                  <f.icon className="h-4 w-4" style={{ color: TEAL }} />
                </div>
                <h3 className="font-semibold text-sm mb-1.5">{f.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: MUTED }}>{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-20">
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
      </section>

      {/* Security */}
      <section id="security" className="py-20" style={{ backgroundColor: '#f5f5f0', borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: TEAL }}>Security</span>
            <h2 className="mt-3 text-3xl font-normal" style={{ fontFamily: SERIF }}>
              Your contracts are commercially sensitive. We treat them that way.
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { title: 'Encrypted everywhere', text: 'Documents and data are encrypted in transit (TLS 1.2+) and at rest (AES-256).' },
              { title: 'Tenant isolation', text: 'Row-level security isolates every organisation’s data at the database layer — not just in application code.' },
              { title: 'Australian data residency', text: 'Your data lives in Australian data centres (Sydney region) with daily encrypted backups.' },
              { title: 'Role-based access', text: 'Admin, manager and viewer roles, with scoped, time-limited, revocable vendor portal links.' },
              { title: 'Immutable audit trail', text: 'Every result, approval, exemption and change is recorded. Locked periods cannot be silently edited.' },
              { title: 'Your data stays yours', text: 'AI reads your contracts to serve you — your documents are never used to train models, and you can export or delete at any time.' },
            ].map(s => (
              <div key={s.title} className="rounded-xl p-5" style={{ background: 'white', border: `1px solid ${BORDER}` }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: '#f0fdfa' }}>
                  <Shield className="h-4 w-4" style={{ color: TEAL }} />
                </div>
                <h3 className="font-semibold text-sm mb-1.5">{s.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: MUTED }}>{s.text}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-xs" style={{ color: '#a8a29e' }}>
            Questions about security or compliance? <a href="mailto:jawad@mypropiq.com.au?subject=VericonIQ%20Security" className="underline underline-offset-2" style={{ color: TEAL }}>Talk to us</a> — Enterprise plans include private cloud or on-premises deployment.
          </p>
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
              <h3 className="font-bold text-lg text-white mb-2">You&apos;re on the list</h3>
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
                  What does your contract portfolio look like? <span style={{ color: '#a8a29e' }}>(optional)</span>
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
                <p className="text-sm text-center" style={{ color: '#dc2626' }}>Something went wrong — please try again.</p>
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
            <span className="text-xs ml-2" style={{ color: '#a8a29e' }}>© {new Date().getFullYear()}</span>
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
