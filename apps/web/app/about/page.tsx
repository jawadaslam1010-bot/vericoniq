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
  Mail,
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

export default function AboutPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#fafaf8', color: '#1c1917' }}>
      {/* Nav */}
      <nav
        className="sticky top-0 z-40"
        style={{ backgroundColor: '#fafaf8', borderBottom: '1px solid #e8e4dc' }}
      >
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: '#0d9488' }}
            >
              <span className="text-white font-bold text-sm">V</span>
            </div>
            <span className="font-bold text-lg" style={{ color: '#1c1917' }}>
              VericonIQ
            </span>
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1.5"
            style={{ backgroundColor: '#0d9488', color: 'white' }}
          >
            Sign in
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-16 pb-4 text-center">
        <h1
          className="font-normal leading-tight"
          style={{
            fontSize: 'clamp(2.2rem, 5vw, 3.4rem)',
            color: '#1c1917',
            lineHeight: 1.12,
            fontFamily: 'var(--font-dm-serif), Georgia, serif',
          }}
        >
          About <span style={{ color: '#0d9488' }}>VericonIQ</span>
        </h1>
        <p className="mt-5 text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: '#78716c' }}>
          AI reads your contracts and extracts every obligation, KPI and deadline.
          Nothing buried. Nothing missed.
        </p>
      </section>

      {/* Origin story */}
      <section className="max-w-4xl mx-auto px-6 py-16">
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
            style={{ color: '#1c1917', fontFamily: 'var(--font-dm-serif), Georgia, serif' }}
          >
            Built by someone who has lived it — on both sides
          </h2>

          <div className="mt-6 space-y-5 text-base leading-relaxed" style={{ color: '#57534e' }}>
            <p>
              With over{' '}
              <strong style={{ color: '#1c1917' }}>
                two decades in telecommunications and technology
              </strong>
              , I have worked on both sides of the table — as a buyer managing large managed
              service providers, and as a vendor delivering complex contracted services to
              enterprise clients.
            </p>
            <p>
              That experience made one gap impossible to ignore. Contract performance management
              had never been given the proper tooling it deserved.{' '}
              <strong style={{ color: '#1c1917' }}>KPIs buried in schedules. Obligations
              tracked in shared spreadsheets. Service credits left unclaimed</strong> because
              nobody could quickly confirm what the contract actually required.
              The knowledge was always there — it just took too long to surface.
            </p>
            <p>
              When AI reached the point where it could actually <em>read</em> these contracts
              and extract structured, reliable meaning from them, the opportunity was clear.
              VericonIQ started in the telco and managed services world I know best, but the
              need stretches well beyond it.{' '}
              <strong style={{ color: '#1c1917' }}>Construction, facilities, IT, cloud,
              supply chain</strong> — wherever there are commercial contracts, teams deserve
              a system that keeps up with them.
            </p>
            <p>That is what we are building.</p>
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
              The platform
            </span>
            <h2
              className="mt-3 text-3xl font-normal"
              style={{ color: '#1c1917', fontFamily: 'var(--font-dm-serif), Georgia, serif' }}
            >
              Everything your contracts team needs
            </h2>
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

      {/* Footer CTA */}
      <section className="max-w-2xl mx-auto px-6 py-16 text-center">
        <p className="text-sm" style={{ color: '#78716c' }}>
          Ready to see your contracts clearly?{' '}
          <Link href="/signup" className="font-semibold underline underline-offset-2" style={{ color: '#0d9488' }}>
            Start free
          </Link>
          {' '}— or contact us above for a walkthrough.
        </p>
        <p className="mt-6 text-xs" style={{ color: '#a8a29e' }}>
          © {new Date().getFullYear()} VericonIQ · vericoniq.com
        </p>
      </section>
    </div>
  )
}
