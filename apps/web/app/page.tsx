'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  FileText,
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
  MessageSquare,
  Building2,
  Globe,
} from 'lucide-react'

function ContactButton() {
  const [revealed, setRevealed] = useState(false)
  const parts = ['jawad', '@', 'mypropiq', '.com.au']
  const email = parts.join('')

  if (revealed) {
    return (
      <a
        href={`mailto:${email}`}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-700 hover:border-emerald-600 px-4 py-2 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
      >
        <Mail className="h-4 w-4" />
        {email}
      </a>
    )
  }

  return (
    <button
      onClick={() => setRevealed(true)}
      className="inline-flex items-center gap-2 rounded-lg border border-slate-700 hover:border-slate-500 px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
    >
      <Mail className="h-4 w-4" />
      Contact the founder
    </button>
  )
}

const FEATURES = [
  {
    icon: Brain,
    title: 'AI Contract Extraction',
    description:
      'Upload your MSA, schedules and amendments. Our AI reads every page and extracts all KPIs, obligations, service credits and key terms — automatically.',
    status: 'live',
  },
  {
    icon: Layers,
    title: 'Multi-Document Hierarchy',
    description:
      'Manage complex contracts with 10, 20 or more documents. Smart precedence ordering ensures amendments always override base documents.',
    status: 'live',
  },
  {
    icon: FileText,
    title: 'KPI & Obligation Register',
    description:
      'Every contractual commitment in one structured register — targets, cadence, measurement rules and clause references included.',
    status: 'live',
  },
  {
    icon: TrendingUp,
    title: 'SLA Performance Tracking',
    description:
      'Track actual performance against contractual targets period by period. Instantly see who is meeting obligations and who is not.',
    status: 'coming-soon',
  },
  {
    icon: Shield,
    title: 'Service Credit Calculator',
    description:
      'When SLAs are missed, credits calculate automatically based on the exact formula in your contract. No more spreadsheet disputes.',
    status: 'coming-soon',
  },
  {
    icon: BarChart2,
    title: 'Vendor Scorecards',
    description:
      'Weighted health scores for every vendor across all active contracts. Know at a glance who your best and worst performers are.',
    status: 'coming-soon',
  },
  {
    icon: Bell,
    title: 'Renewal & Deadline Alerts',
    description:
      'Never miss a notice period or auto-renewal window again. Proactive alerts weeks before critical dates so you stay in control.',
    status: 'coming-soon',
  },
  {
    icon: Users,
    title: 'Both Sides Supported',
    description:
      'Built for buyers managing vendors AND vendors managing client obligations. One platform, two perspectives.',
    status: 'coming-soon',
  },
  {
    icon: Globe,
    title: 'Multi-Sector & Global',
    description:
      'Telco, IT, cloud, facilities, construction, supply chain — if it has a contract and KPIs, VericonIQ handles it. Multi-currency included.',
    status: 'coming-soon',
  },
]

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
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Nav */}
      <nav className="border-b border-slate-800 sticky top-0 z-40 bg-slate-950/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-white rounded-md flex items-center justify-center">
              <span className="text-slate-900 font-bold text-xs">V</span>
            </div>
            <span className="font-semibold text-white">VericonIQ</span>
          </div>
          <Link
            href="/login"
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            Sign in →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-4 py-1.5 text-xs text-slate-400 mb-8">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          Currently in private beta — join the waitlist
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-white leading-tight">
          Contract intelligence.
          <br />
          <span className="text-emerald-400">Verified.</span>
        </h1>

        <p className="mt-6 text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
          VericonIQ uses AI to extract, structure and track every KPI, obligation and service credit
          buried in your commercial contracts — so nothing falls through the cracks.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#waitlist"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold px-6 py-3 text-sm transition-colors"
          >
            Join the waitlist
            <ArrowRight className="h-4 w-4" />
          </a>
          <a
            href="#story"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white px-6 py-3 text-sm transition-colors"
          >
            Our story
          </a>
        </div>
      </section>

      {/* Origin Story */}
      <section id="story" className="bg-slate-900 border-y border-slate-800">
        <div className="max-w-4xl mx-auto px-6 py-20">
          <div className="flex items-center gap-3 mb-8">
            <Building2 className="h-5 w-5 text-emerald-400" />
            <span className="text-sm font-medium text-emerald-400 uppercase tracking-widest">
              The Origin Story
            </span>
          </div>

          <h2 className="text-3xl font-bold text-white mb-8">
            Built from two decades of frustration
          </h2>

          <div className="space-y-6 text-slate-300 text-lg leading-relaxed">
            <p>
              With over <strong className="text-white">two decades of experience</strong> in
              telecommunications and technology, I have sat on both sides of the table — as a
              buyer managing large managed service providers, and as a vendor delivering complex
              contracted services to enterprise clients.
            </p>

            <p>
              And in all that time, one thing never changed: the way we managed service contracts
              was <strong className="text-white">completely ad hoc</strong>. Critical KPIs buried
              in a schedule nobody had read in years. SLA obligations tracked in a spreadsheet
              that three people had edited. Service credits either missed entirely or disputed
              endlessly because nobody agreed on what the contract actually said.
            </p>

            <p>
              Every organisation I worked with — regardless of size — had the same problem.
              Multi-thousand-page contracts, dozens of schedules and amendments, obligations
              scattered across documents with no single source of truth. Performance reviews became
              exercises in archaeology rather than accountability.
            </p>

            <p>
              When AI reached the point where it could actually <em>read</em> these contracts and
              extract structured meaning from them, I knew the moment had come. VericonIQ started
              as a solution to the telco and managed services world I knew best — but it quickly
              became clear that <strong className="text-white">every sector has this problem</strong>.
              Construction. Facilities. IT. Cloud. Supply chain. Anywhere there are commercial
              contracts, there are missed obligations, disputed credits and renewal windows
              that sneak up on you.
            </p>

            <p>
              So we are building something that works for{' '}
              <strong className="text-white">all of it</strong>.
            </p>
          </div>

          <div className="mt-10 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-slate-400 text-sm">
              — <span className="text-white font-medium">Jawad Aslam</span>, Founder, VericonIQ
            </p>
            <ContactButton />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-sm font-medium text-emerald-400 uppercase tracking-widest">
              What we are building
            </span>
          </div>
          <h2 className="text-3xl font-bold text-white">
            Everything your contracts team needs
          </h2>
          <p className="mt-4 text-slate-400 max-w-xl mx-auto">
            From AI extraction on day one to full vendor performance management — built for
            procurement, contract and operations teams.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-slate-800 bg-slate-900 p-6 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
                  <feature.icon className="h-5 w-5 text-emerald-400" />
                </div>
                {feature.status === 'live' ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-900/50 border border-emerald-800 px-2 py-0.5 text-xs text-emerald-400">
                    <CheckCircle className="h-3 w-3" />
                    Live in beta
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 border border-slate-700 px-2 py-0.5 text-xs text-slate-400">
                    Coming soon
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Who it's for */}
      <section className="bg-slate-900 border-y border-slate-800">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-white text-center mb-10">
            Built for both sides of the contract
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="rounded-xl border border-slate-700 p-6">
              <h3 className="font-semibold text-white mb-3 text-lg">Buyers & Procurement Teams</h3>
              <ul className="space-y-2 text-slate-400 text-sm">
                {[
                  'Hold vendors accountable to their contracted SLAs',
                  'Never miss a notice period or auto-renewal window',
                  'Calculate service credits automatically',
                  'Benchmark vendor performance across your portfolio',
                  'Reduce time spent in contract review meetings',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-slate-700 p-6">
              <h3 className="font-semibold text-white mb-3 text-lg">Vendors & Service Providers</h3>
              <ul className="space-y-2 text-slate-400 text-sm">
                {[
                  'Know exactly what you are contracted to deliver',
                  'Track your own performance before clients do',
                  'Manage obligations across multiple client contracts',
                  'Proactively flag risks before they become disputes',
                  'Demonstrate performance with data, not just words',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Waitlist / Feedback Form */}
      <section id="waitlist" className="max-w-2xl mx-auto px-6 py-20">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <MessageSquare className="h-5 w-5 text-emerald-400" />
            <span className="text-sm font-medium text-emerald-400 uppercase tracking-widest">
              Get early access
            </span>
          </div>
          <h2 className="text-3xl font-bold text-white">Join the waitlist</h2>
          <p className="mt-4 text-slate-400">
            We are onboarding early users now. Tell us about your use case and what you would most
            like to see — your feedback shapes what we build next.
          </p>
        </div>

        {status === 'success' ? (
          <div className="rounded-xl border border-emerald-800 bg-emerald-900/30 p-8 text-center">
            <CheckCircle className="h-10 w-10 text-emerald-400 mx-auto mb-4" />
            <h3 className="font-semibold text-white text-lg mb-2">You are on the list!</h3>
            <p className="text-slate-400 text-sm">
              Thank you for your interest. We will be in touch soon with early access details.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="rounded-xl border border-slate-800 bg-slate-900 p-8 space-y-5"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300">Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Jane Smith"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300">Work email *</label>
                <input
                  type="email"
                  required
                  placeholder="jane@yourorg.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300">Your role</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
              <label className="text-sm font-medium text-slate-300">
                What would you most like to see? <span className="text-slate-500">(optional)</span>
              </label>
              <textarea
                rows={4}
                placeholder="Tell us about your biggest pain point with contract management, or a feature you would love to see..."
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>

            {status === 'error' && (
              <p className="text-sm text-red-400">
                Something went wrong. Please try again or email us directly.
              </p>
            )}

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-900 font-semibold px-6 py-3 text-sm transition-colors flex items-center justify-center gap-2"
            >
              <Mail className="h-4 w-4" />
              {status === 'loading' ? 'Submitting...' : 'Request early access'}
            </button>
          </form>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-white rounded-md flex items-center justify-center">
              <span className="text-slate-900 font-bold text-xs">V</span>
            </div>
            <span className="text-sm font-semibold text-white">VericonIQ</span>
          </div>
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} VericonIQ. All rights reserved.
          </p>
          <Link href="/login" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
            Sign in to dashboard →
          </Link>
        </div>
      </footer>
    </div>
  )
}
