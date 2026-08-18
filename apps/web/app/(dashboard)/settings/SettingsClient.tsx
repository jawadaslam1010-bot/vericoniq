'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, UserPlus, X, Shield } from 'lucide-react'
import { api } from '@/lib/trpc/client'
import { planHasFeature } from '@contractly/types'
import { LockedFeaturePanel } from '@/components/shared/locked-feature'
import { BillingSection } from './BillingSection'

type Role = 'admin' | 'manager' | 'viewer'

const ROLE_LABEL: Record<Role, string> = { admin: 'Admin', manager: 'Manager', viewer: 'Viewer' }
const ROLE_DESC: Record<Role, string> = {
  admin: 'Full access, including team and settings',
  manager: 'Manage vendors, contracts, KPIs and submissions',
  viewer: 'Read-only access',
}

export function SettingsClient({ currentRole }: { currentRole: Role }) {
  const isAdmin = currentRole === 'admin'
  return (
    <div className="space-y-8">
      <OrgProfile isAdmin={isAdmin} />
      <BillingSection isAdmin={isAdmin} />
      <TeamMembers isAdmin={isAdmin} />
    </div>
  )
}

// ─── Org profile ──────────────────────────────────────────────────────────────

function OrgProfile({ isAdmin }: { isAdmin: boolean }) {
  const utils = api.useUtils()
  const { data: org, isLoading } = api.team.getOrg.useQuery()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [abn, setAbn] = useState('')
  const [industry, setIndustry] = useState('')

  const update = api.team.updateOrg.useMutation({
    onSuccess: () => {
      toast.success('Organisation updated')
      setEditing(false)
      utils.team.getOrg.invalidate()
    },
    onError: (e) => toast.error(e.message),
  })

  const startEdit = () => {
    setName(org?.name ?? '')
    setAbn(org?.abn ?? '')
    setIndustry(org?.industry ?? '')
    setEditing(true)
  }

  return (
    <section className="bg-surface rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[15px] font-semibold text-ink">Organisation</h2>
        {isAdmin && !editing && !isLoading && (
          <button onClick={startEdit} className="text-[13px] font-medium text-primary hover:underline">Edit</button>
        )}
      </div>

      {isLoading ? (
        <div className="text-[13px] text-muted">Loading…</div>
      ) : editing ? (
        <div className="space-y-3 max-w-md">
          <Field label="Name">
            <input value={name} onChange={e => setName(e.target.value)} className={inputCls} />
          </Field>
          <Field label="ABN">
            <input value={abn} onChange={e => setAbn(e.target.value)} placeholder="11 digits" className={inputCls} />
          </Field>
          <Field label="Industry">
            <input value={industry} onChange={e => setIndustry(e.target.value)} className={inputCls} />
          </Field>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => update.mutate({ name, abn: abn.trim() || null, industry: industry.trim() || null })}
              disabled={update.isPending || name.trim().length < 2}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-white text-[13px] font-medium px-3.5 py-2 hover:bg-primary-hover disabled:opacity-50"
            >
              {update.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Save
            </button>
            <button onClick={() => setEditing(false)} className="rounded-lg border border-border text-[13px] text-ink-soft px-3.5 py-2 hover:bg-hover">Cancel</button>
          </div>
        </div>
      ) : (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-[13px]">
          <Row label="Name" value={org?.name} />
          <Row label="Plan" value={org?.plan ? org.plan.charAt(0).toUpperCase() + org.plan.slice(1) : '—'} />
          <Row label="ABN" value={org?.abn || '—'} />
          <Row label="Industry" value={org?.industry || '—'} />
        </dl>
      )}
    </section>
  )
}

// ─── Team members ─────────────────────────────────────────────────────────────

function TeamMembers({ isAdmin }: { isAdmin: boolean }) {
  const utils = api.useUtils()
  const { data: members, isLoading } = api.team.listMembers.useQuery()
  const { data: invites } = api.team.listInvitations.useQuery()
  const { data: teamOrg } = api.team.getOrg.useQuery()
  const canInvite = planHasFeature(teamOrg?.plan ?? 'starter', 'teamInvites')

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<Role>('viewer')
  const [showInvite, setShowInvite] = useState(false)

  const invalidate = () => {
    utils.team.listMembers.invalidate()
    utils.team.listInvitations.invalidate()
  }

  const invite = api.team.invite.useMutation({
    onSuccess: () => { toast.success('Invitation sent'); setInviteEmail(''); setShowInvite(false); invalidate() },
    onError: (e) => toast.error(e.message),
  })
  const changeRole = api.team.changeRole.useMutation({
    onSuccess: () => { toast.success('Role updated'); invalidate() },
    onError: (e) => toast.error(e.message),
  })
  const removeMember = api.team.removeMember.useMutation({
    onSuccess: () => { toast.success('Member removed'); invalidate() },
    onError: (e) => toast.error(e.message),
  })
  const revoke = api.team.revokeInvitation.useMutation({
    onSuccess: () => { toast.success('Invitation revoked'); invalidate() },
    onError: (e) => toast.error(e.message),
  })

  return (
    <section className="bg-surface rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">Team</h2>
          <p className="text-[12.5px] text-muted mt-0.5">People with access to this organisation.</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowInvite(v => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-white text-[13px] font-medium px-3 py-2 hover:bg-primary-hover"
          >
            <UserPlus className="h-3.5 w-3.5" />Invite
          </button>
        )}
      </div>

      {isAdmin && showInvite && !canInvite && (
        <div className="mb-4">
          <LockedFeaturePanel feature="teamInvites" compact />
        </div>
      )}

      {isAdmin && showInvite && canInvite && (
        <div className="flex flex-col sm:flex-row gap-2 mb-4 p-3 rounded-lg bg-page border border-border-soft">
          <input
            type="email"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            placeholder="teammate@company.com"
            className={inputCls + ' flex-1'}
          />
          <select value={inviteRole} onChange={e => setInviteRole(e.target.value as Role)} className={inputCls + ' sm:w-36'}>
            <option value="viewer">Viewer</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
          <button
            onClick={() => invite.mutate({ email: inviteEmail.trim(), role: inviteRole })}
            disabled={invite.isPending || !inviteEmail.includes('@')}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary text-white text-[13px] font-medium px-3.5 py-2 hover:bg-primary-hover disabled:opacity-50"
          >
            {invite.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Send
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="text-[13px] text-muted">Loading…</div>
      ) : (
        <div className="divide-y divide-border-soft">
          {members?.map(m => (
            <div key={m.id} className="flex items-center justify-between py-3 gap-3">
              <div className="min-w-0">
                <div className="text-[13.5px] font-medium text-ink truncate">
                  {m.fullName ?? m.email ?? 'Unknown'}
                  {m.isSelf && <span className="ml-2 text-[11px] text-muted">(you)</span>}
                </div>
                <div className="text-[12px] text-muted truncate">{m.email ?? '—'}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isAdmin && !m.isSelf ? (
                  <>
                    <select
                      value={m.role}
                      onChange={e => changeRole.mutate({ userId: m.id, role: e.target.value as Role })}
                      className="rounded-md border border-border bg-surface text-[12.5px] px-2 py-1.5 text-ink-soft"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      onClick={() => { if (confirm(`Remove ${m.fullName ?? m.email}?`)) removeMember.mutate({ userId: m.id }) }}
                      title="Remove member"
                      className="p-1.5 rounded-md text-muted hover:text-status-breach-text hover:bg-status-breach-bg transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-hover px-2.5 py-1 text-[11.5px] font-medium text-ink-soft">
                    {m.role === 'admin' && <Shield className="h-3 w-3" />}{ROLE_LABEL[m.role as Role]}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pending invitations */}
      {invites && invites.length > 0 && (
        <div className="mt-5 pt-4 border-t border-border-soft">
          <h3 className="text-[12px] font-bold uppercase tracking-eyebrow text-muted mb-2">Pending invitations</h3>
          <div className="divide-y divide-border-soft">
            {invites.map(inv => (
              <div key={inv.id} className="flex items-center justify-between py-2.5 gap-3">
                <div className="min-w-0">
                  <div className="text-[13px] text-ink truncate">{inv.email}</div>
                  <div className="text-[11.5px] text-muted">{ROLE_LABEL[inv.role as Role]} · invited</div>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => revoke.mutate({ invitationId: inv.id })}
                    className="text-[12px] text-muted hover:text-status-breach-text"
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-4 text-[11.5px] text-faint">
        {Object.entries(ROLE_DESC).map(([r, d]) => `${ROLE_LABEL[r as Role]}: ${d}`).join(' · ')}
      </p>
    </section>
  )
}

// ─── Small helpers ────────────────────────────────────────────────────────────

const inputCls = 'rounded-lg border border-border bg-surface px-3 py-2 text-[13.5px] text-ink focus:outline-none focus:ring-2 focus:ring-primary/30'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[12.5px] font-medium text-ink-soft mb-1">{label}</span>
      {children}
    </label>
  )
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-[11.5px] font-bold uppercase tracking-eyebrow text-muted">{label}</dt>
      <dd className="text-ink mt-0.5">{value ?? '—'}</dd>
    </div>
  )
}
