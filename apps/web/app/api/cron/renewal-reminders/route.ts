export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@contractly/db'
import { contracts, vendors, users } from '@contractly/db/schema'
import { eq, and, isNotNull } from '@contractly/db'
import { createAdminClient } from '@/lib/supabase/server'
import { sendRenewalReminder } from '@/lib/email'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
// Reminder stages in days-before-deadline, tightest last.
const STAGES = [90, 60, 30]

function daysUntil(d: string): number {
  const deadline = new Date(d + 'T00:00:00').getTime()
  return Math.ceil((deadline - Date.now()) / 86_400_000)
}

// The tightest stage the deadline has entered, or null if still > 90 days out.
function stageFor(days: number): number | null {
  if (days < 0) return null
  for (const s of [...STAGES].sort((a, b) => a - b)) {
    if (days <= s) return s
  }
  return null
}

function fmtDate(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
}

export async function GET(req: NextRequest) {
  // Protect the endpoint. Vercel Cron sends `Authorization: Bearer $CRON_SECRET`.
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const rows = await db
    .select({
      id: contracts.id,
      orgId: contracts.orgId,
      name: contracts.name,
      vendorId: contracts.vendorId,
      vendorName: vendors.name,
      noticeDeadline: contracts.noticeDeadline,
      lastStage: contracts.renewalReminderStage,
    })
    .from(contracts)
    .innerJoin(vendors, eq(contracts.vendorId, vendors.id))
    .where(and(eq(contracts.status, 'active'), isNotNull(contracts.noticeDeadline)))

  // Which contracts have crossed a new, not-yet-notified stage
  const due = rows.flatMap(c => {
    if (!c.noticeDeadline) return []
    const days = daysUntil(c.noticeDeadline)
    const stage = stageFor(days)
    if (stage == null) return []
    // Fire only when we've entered a tighter stage than last sent.
    if (c.lastStage != null && c.lastStage <= stage) return []
    return [{ ...c, days, stage }]
  })

  if (due.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, checked: rows.length })
  }

  const admin = await createAdminClient()

  // Resolve recipient emails per org once (admins + managers).
  const orgIds = [...new Set(due.map(c => c.orgId))]
  const orgRecipients = new Map<string, string[]>()
  for (const orgId of orgIds) {
    const staff = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.orgId, orgId))
    const emails: string[] = []
    for (const u of staff) {
      if (u.role !== 'admin' && u.role !== 'manager') continue
      const { data } = await admin.auth.admin.getUserById(u.id)
      if (data?.user?.email) emails.push(data.user.email)
    }
    orgRecipients.set(orgId, emails)
  }

  let sent = 0
  for (const c of due) {
    const recipients = orgRecipients.get(c.orgId) ?? []
    if (recipients.length === 0) continue
    try {
      await Promise.all(recipients.map(to =>
        sendRenewalReminder({
          to,
          contractName: c.name,
          vendorName: c.vendorName,
          deadlineLabel: fmtDate(c.noticeDeadline!),
          daysRemaining: c.days,
          deadlineType: 'notice deadline',
          contractUrl: `${APP_URL}/vendors/${c.vendorId}/contracts/${c.id}`,
        })
      ))
      await db
        .update(contracts)
        .set({ renewalReminderStage: c.stage, renewalReminderSentAt: new Date() })
        .where(eq(contracts.id, c.id))
      sent += 1
    } catch (err) {
      console.error('[cron/renewal-reminders] send failed for contract', c.id, err)
    }
  }

  return NextResponse.json({ ok: true, sent, checked: rows.length })
}
