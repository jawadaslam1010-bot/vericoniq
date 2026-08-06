export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { db } from '@contractly/db'
import { invitations, organisations } from '@contractly/db/schema'
import { eq } from '@contractly/db'
import { AcceptForm } from './AcceptForm'

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-page flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[420px]">
        <div className="flex items-center gap-2.5 mb-6 justify-center">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-serif text-white text-[16px] leading-none">V</div>
          <span className="font-semibold text-[16px] text-ink">VericonIQ</span>
        </div>
        <div className="bg-surface rounded-2xl border border-border shadow-sm p-8">{children}</div>
      </div>
    </div>
  )
}

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const [invite] = await db.select().from(invitations).where(eq(invitations.token, token)).limit(1)

  const invalid = !invite || invite.status !== 'pending' || new Date(invite.expiresAt) < new Date()
  if (invalid) {
    return (
      <Shell>
        <h1 className="font-serif text-[22px] text-ink">Invitation unavailable</h1>
        <p className="text-[14px] text-muted mt-2 leading-relaxed">
          {invite?.status === 'accepted'
            ? 'This invitation has already been accepted. Try signing in instead.'
            : invite?.status === 'revoked'
            ? 'This invitation was revoked by an administrator.'
            : 'This invitation link is invalid or has expired. Ask your administrator to send a new one.'}
        </p>
        <Link href="/login" className="inline-flex mt-6 text-[13px] font-medium text-primary hover:underline">
          Go to sign in →
        </Link>
      </Shell>
    )
  }

  const [org] = await db
    .select({ name: organisations.name })
    .from(organisations)
    .where(eq(organisations.id, invite.orgId))
    .limit(1)

  const roleLabel = invite.role.charAt(0).toUpperCase() + invite.role.slice(1)

  return (
    <Shell>
      <h1 className="font-serif text-[22px] text-ink">Join {org?.name ?? 'the team'}</h1>
      <p className="text-[14px] text-muted mt-2 leading-relaxed">
        You&apos;ve been invited as a <strong className="text-ink-soft">{roleLabel}</strong>. Set up your account for{' '}
        <strong className="text-ink-soft">{invite.email}</strong> to continue.
      </p>
      <div className="mt-6">
        <AcceptForm token={token} email={invite.email} />
      </div>
    </Shell>
  )
}
