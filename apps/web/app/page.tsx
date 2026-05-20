'use client'

import { useState } from 'react'
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
  Mail,
  Gift,
} from 'lucide-react'

const FEATURES = [
  {
    icon: Brain,
    title: 'AI Contract Extraction',
    description:
      'Upload your contracts and AI extracts every KPI, obligation and service credit automatically.',
  },
  {
    icon: Layers,
    title: 'Multi-Document Support',
    description:
      'Handles complex contracts with dozens of schedules and amendments — hierarchy managed automatically.',
  },
  {
    icon: TrendingUp,
    title: 'SLA Performance Tracking',
    description: 'Track actual performance against contracted targets period by period.',
  },
  {
    icon: Shield,
    title: 'Service Credit Calculator',
    description:
      'Credits calculated automatically based on the exact formula in your contract.',
  },
  {
    icon: BarChart2,
    title: 'Vendor Scorecards',
    description: 'Weighted health scores for every vendor across all active contracts.',
  },
  {
    icon: Bell,
    title: 'Renewal & Deadline Alerts',
    description: 'Never miss a notice period or auto-renewal window again.',
  },
  {
    icon: Users,
    title: 'Works for Both Sides',
    description:
      'Built for buyers managing vendors AND vendors managing their client obligations.',
  },
  {
    icon: CheckCircle,
    title: 'Multi-Sector & Global',
    description:
      'Telco, IT, cloud, facilities, construction — if it has a contract, VericonIQ handles it.',
  },
]

function ContactButton() {
  const [revealed, setRevealed] = useState(false)
  const parts = ['jawad', '@', 'mypropiq', '.com.au']
  const email = parts.join('')

  if (revealed) {
    return (
      <a
        href={`mailto:${email}`}
        className="inline-flex items-center gap-2 font-medium text-sm transition-opacity hover:opacity-70"
        style={{ color: '#0d9488' }}
      >
        <Mail className="h-4 w-4" />
        {email}
      </a>
    )
  }

  return (
    <button
      onClick={() => setRevealed(true)}
      className="inline-flex items-center gap-2 font-medium text-sm transition-opacity hover:opacity-70"
      style={{ color: '#0d9488' }}
    >
      <Mail className="h-4 w-4" />
      Contact the founder
    </button>
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

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#fafaf8', color: '#1c1917' }}>

      {/* Announcement bar */}
      <div
        className="text-center py-2.5 px-4 text-sm font-medium"
        style={{ backgroundColor: '#0d9488', color: 'white' }}
      >
        🎁 Share your feedback and get{' '}
        <strong>3 months free</strong> when VericonIQ launches.{' '}
        <a href="#feedback" className="underline underline-offset-2 opacity-80 hover:opacity-100">
          Tell us what you need →
        </a>
      </div>

      {/* Nav */}
      <nav
        className="sticky top-0 z-40"
        style={{ backgroundColor: '#fafaf8', borderBottom: '1px solid #e8e4dc' }}
      >
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: '#0d9488' }}
            >
              <span className="text-white font-bold text-sm">V</span>
            </div>
            <span className="font-bold text-lg" style={{ color: '#1c1917' }}>
              VericonIQ
            </span>
          </div>
          <span
            className="text-xs font-semibold rounded-full px-3 py-1.5"
            style={{ backgroundColor: '#0d9488', color: 'white' }}
          >
            Coming Soon
          </span>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <h1
          className="font-normal leading-tight"
          style={{
            fontSize: 'clamp(2.5rem, 6vw, 4rem)',
            color: '#1c1917',
            lineHeight: 1.12,
            fontFamily: 'var(--font-dm-serif), Georgia, serif',
          }}
        >
          Contract management,
          <br />
          <span style={{ color: '#0d9488' }}>the way it should be</span>
        </h1>

        <p
          className="mt-6 text-xl max-w-2xl mx-auto leading-relaxed"
          style={{ color: '#78716c' }}
        >
          AI reads your contracts and extracts every obligation, KPI and deadline. Nothing
          buried. Nothing missed.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#feedback"
            className="inline-flex items-center gap-2 rounded-xl text-white font-semibold px-7 py-3.5 text-sm shadow-sm hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#0d9488' }}
          >
            Share feedback & get 3 months free
            <ArrowRight className="h-4 w-4" />
          </a>
          <a
            href="#story"
            className="inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-sm font-medium transition-colors"
            style={{ border: '1px solid #d6d3d1', color: '#57534e', backgroundColor: 'white' }}
          >
            Our story
          </a>
        </div>
      </section>

      {/* 3 months free — prominent banner */}
      <section style={{ backgroundColor: '#f0fdfa', borderTop: '1px solid #99f6e4', borderBottom: '1px solid #99f6e4' }}>
        <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center gap-6">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: '#ccfbf1' }}
          >
            <Gift className="h-7 w-7" style={{ color: '#0d9488' }} />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="font-bold text-lg mb-1" style={{ color: '#1c1917' }}>
              3 months free — for people who help us build this right
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: '#78716c' }}>
              We are still building. Share your biggest contract management problem below and
              we will note your email. When VericonIQ launches, your first 3 months are on us.
              No card. No catch.
            </p>
          </div>
          <a
            href="#feedback"
            className="shrink-0 rounded-xl text-white font-semibold px-6 py-3 text-sm hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#0d9488' }}
          >
            Share feedback →
          </a>
        </div>
      </section>

      {/* Origin Story */}
      <section id="story" className="max-w-4xl mx-auto px-6 py-20">
        <div
          className="rounded-2xl p-8 sm:p-12"
          style={{ backgroundColor: 'white', border: '1px solid #e8e4dc' }}
        >
          <span
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: '#0d9488' }}
          >
            The Origin Story
          </span>
          <h2
            className="mt-3 text-3xl font-normal"
            style={{
              color: '#1c1917',
              fontFamily: 'var(--font-dm-serif), Georgia, serif',
            }}
          >
            Built from two decades of frustration
          </h2>

          <div className="mt-6 space-y-5 text-base leading-relaxed" style={{ color: '#57534e' }}>
            <p>
              With over{' '}
              <strong style={{ color: '#1c1917' }}>
                two decades in telecommunications and technology
              </strong>
              , I have sat on both sides of the table — as a buyer managing large managed
              service providers, and as a vendor delivering complex contracted services to
              enterprise clients.
            </p>
            <p>
              In all that time, one thing never changed: the way we managed service contracts
              was{' '}
              <strong style={{ color: '#1c1917' }}>completely ad hoc</strong>. Critical KPIs
              buried in a schedule nobody had read in years. SLA obligations tracked in a
              spreadsheet that three people had edited. Service credits either missed entirely
              or disputed endlessly because nobody agreed on what the contract actually said.
            </p>
            <p>
              When AI reached the point where it could actually <em>read</em> these contracts
              and extract structured meaning from them, I knew the moment had come. VericonIQ
              started as a solution to the telco and managed services world I knew best — but
              it quickly became clear that{' '}
              <strong style={{ color: '#1c1917' }}>every sector has this problem</strong>.
              Construction, facilities, IT, cloud, supply chain — anywhere there are
              commercial contracts, there are missed obligations and deadlines that sneak up on
              you.
            </p>
            <p>
              So we are building something that works for{' '}
              <strong style={{ color: '#1c1917' }}>all of it</strong>.
            </p>
          </div>

          <div
            className="mt-8 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            style={{ borderTop: '1px solid #e8e4dc' }}
          >
            <p className="text-sm" style={{ color: '#a8a29e' }}>
              —{' '}
              <span className="font-semibold" style={{ color: '#57534e' }}>
                Jawad Aslam
              </span>
              , Founder, VericonIQ
            </p>
            <ContactButton />
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        className="py-20"
        style={{
          backgroundColor: '#f5f5f0',
          borderTop: '1px solid #e8e4dc',
          borderBottom: '1px solid #e8e4dc',
        }}
      >
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <span
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: '#0d9488' }}
            >
              What we are building
            </span>
            <h2
              className="mt-3 text-3xl font-normal"
              style={{
                color: '#1c1917',
                fontFamily: 'var(--font-dm-serif), Georgia, serif',
              }}
            >
              Everything your contracts team needs
            </h2>
            <p className="mt-3 max-w-xl mx-auto" style={{ color: '#78716c' }}>
              Tell us which of these matters most — your feedback shapes what we build first.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl p-5 transition-all hover:shadow-sm"
                style={{ backgroundColor: 'white', border: '1px solid #e8e4dc' }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                  style={{ backgroundColor: '#f0fdfa' }}
                >
                  <feature.icon className="h-4 w-4" style={{ color: '#0d9488' }} />
                </div>
                <h3 className="font-semibold text-sm mb-1.5" style={{ color: '#1c1917' }}>
                  {feature.title}
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: '#78716c' }}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feedback Form */}
      <section id="feedback" className="max-w-2xl mx-auto px-6 py-20">
        <div className="text-center mb-10">
          <span
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: '#0d9488' }}
          >
            Shape the product
          </span>
          <h2
            className="mt-3 text-3xl font-normal"
            style={{
              color: '#1c1917',
              fontFamily: 'var(--font-dm-serif), Georgia, serif',
            }}
          >
            What should we build first?
          </h2>
          <p className="mt-3 text-base leading-relaxed" style={{ color: '#78716c' }}>
            Share your biggest contract management problem. We will note your email and when
            VericonIQ launches, your first{' '}
            <strong style={{ color: '#1c1917' }}>3 months are free</strong>. No credit card.
            No strings.
          </p>
        </div>

        {status === 'success' ? (
          <div
            className="rounded-2xl p-10 text-center"
            style={{ border: '1px solid #99f6e4', backgroundColor: '#f0fdfa' }}
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: '#ccfbf1' }}
            >
              <CheckCircle className="h-7 w-7" style={{ color: '#0d9488' }} />
            </div>
            <h3 className="font-bold text-lg mb-2" style={{ color: '#1c1917' }}>
              You're on the list.
            </h3>
            <p className="text-sm" style={{ color: '#78716c' }}>
              We have noted your details. When VericonIQ launches, your first 3 months are
              on us. We will be in touch.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl p-8 space-y-5 shadow-sm"
            style={{ backgroundColor: 'white', border: '1px solid #e8e4dc' }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label
                  className="block text-sm font-medium"
                  style={{ color: '#1c1917' }}
                >
                  Your name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Jane Smith"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg px-3.5 py-2.5 text-sm focus:outline-none transition"
                  style={{
                    border: '1px solid #e8e4dc',
                    backgroundColor: '#fafaf8',
                    color: '#1c1917',
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <label
                  className="block text-sm font-medium"
                  style={{ color: '#1c1917' }}
                >
                  Work email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="jane@yourorg.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-lg px-3.5 py-2.5 text-sm focus:outline-none transition"
                  style={{
                    border: '1px solid #e8e4dc',
                    backgroundColor: '#fafaf8',
                    color: '#1c1917',
                  }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                className="block text-sm font-medium"
                style={{ color: '#1c1917' }}
              >
                Your role
              </label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full rounded-lg px-3.5 py-2.5 text-sm focus:outline-none transition"
                style={{
                  border: '1px solid #e8e4dc',
                  backgroundColor: '#fafaf8',
                  color: '#1c1917',
                }}
              >
                <option value="">Select your role...</option>
                <option value="procurement">Procurement / Contracts Manager</option>
                <option value="vendor_manager">Vendor Manager</option>
                <option value="operations">Operations / Service Delivery</option>
                <option value="legal">Legal / Compliance</option>
                <option value="executive">Executive / C-Suite</option>
                <option value="vendor_side">Vendor / Service Provider</option>
                <option value="consultant">Consultant / Advisor</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label
                className="block text-sm font-medium"
                style={{ color: '#1c1917' }}
              >
                Your biggest contract management pain point?{' '}
                <span className="font-normal" style={{ color: '#a8a29e' }}>
                  What would you love to see?
                </span>
              </label>
              <textarea
                rows={4}
                placeholder="e.g. We have 30 vendor contracts and no idea who is meeting their SLAs. I would love a dashboard that shows at a glance who is underperforming..."
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full rounded-lg px-3.5 py-2.5 text-sm focus:outline-none transition resize-none"
                style={{
                  border: '1px solid #e8e4dc',
                  backgroundColor: '#fafaf8',
                  color: '#1c1917',
                }}
              />
            </div>

            {status === 'error' && (
              <p className="text-sm" style={{ color: '#dc2626' }}>
                Something went wrong. Please try again.
              </p>
            )}

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full rounded-xl text-white font-semibold px-6 py-3.5 text-sm hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ backgroundColor: '#0d9488' }}
            >
              {status === 'loading'
                ? 'Submitting...'
                : '🎁 Submit feedback & claim 3 months free'}
            </button>

            <p className="text-center text-xs" style={{ color: '#a8a29e' }}>
              No credit card. No commitment. We will email you when we launch.
            </p>
          </form>
        )}
      </section>

      {/* Footer */}
      <footer
        className="py-8"
        style={{ borderTop: '1px solid #e8e4dc', backgroundColor: '#f5f5f0' }}
      >
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ backgroundColor: '#0d9488' }}
            >
              <span className="text-white font-bold text-xs">V</span>
            </div>
            <span className="font-bold text-sm" style={{ color: '#1c1917' }}>
              VericonIQ
            </span>
          </div>
          <p className="text-xs" style={{ color: '#a8a29e' }}>
            © {new Date().getFullYear()} VericonIQ. All rights reserved.
          </p>
          <p className="text-xs" style={{ color: '#a8a29e' }}>
            Contract intelligence. Verified.
          </p>
        </div>
      </footer>
    </div>
  )
}
