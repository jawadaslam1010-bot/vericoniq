import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.FROM_EMAIL ?? 'submissions@vericoniq.com'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export async function sendPortalLink({
  to,
  vendorName,
  contractName,
  periodLabel,
  dueDate,
  token,
}: {
  to: string
  vendorName: string
  contractName: string
  periodLabel: string
  dueDate: string
  token: string
}) {
  const url = `${APP_URL}/portal/${token}`

  await resend.emails.send({
    from: FROM,
    to,
    subject: `KPI submission required — ${contractName} (${periodLabel})`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; margin: 0; padding: 32px 16px;">
  <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden;">

    <!-- Header -->
    <div style="padding: 20px 28px; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; gap: 10px;">
      <div style="width: 28px; height: 28px; border-radius: 6px; background: #6366f1; display: inline-flex; align-items: center; justify-content: center;">
        <span style="color: white; font-weight: bold; font-size: 11px;">V</span>
      </div>
      <span style="font-weight: 600; font-size: 14px; color: #111827;">VericonIQ</span>
    </div>

    <!-- Body -->
    <div style="padding: 32px 28px;">
      <p style="font-size: 15px; color: #374151; margin: 0 0 8px;">Hi ${vendorName} team,</p>
      <p style="font-size: 14px; color: #6b7280; margin: 0 0 24px; line-height: 1.6;">
        Your KPI submission is due for the <strong style="color: #374151;">${periodLabel}</strong> period under contract <strong style="color: #374151;">${contractName}</strong>.
        Please submit your results by <strong style="color: #374151;">${dueDate}</strong>.
      </p>

      <a href="${url}" style="display: inline-block; background: #6366f1; color: white; font-weight: 600; font-size: 14px; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
        Submit KPI results →
      </a>

      <p style="font-size: 12px; color: #9ca3af; margin: 24px 0 0; line-height: 1.5;">
        This link is unique to your submission. Do not forward it. It expires 30 days after the due date.
        If you need a new link, contact your contract manager.
      </p>

      <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 24px 0;">

      <p style="font-size: 11px; color: #d1d5db; margin: 0;">
        Sent by VericonIQ Contract Performance Platform
      </p>
    </div>
  </div>
</body>
</html>
    `.trim(),
  })
}

export async function sendLockNotification({
  to,
  vendorName,
  contractName,
  periodLabel,
  breaches,
  exemptionsApproved,
  total,
  met,
}: {
  to: string
  vendorName: string
  contractName: string
  periodLabel: string
  breaches: number
  exemptionsApproved: number
  total: number
  met: number
}) {
  const healthPct = total > 0 ? Math.round((met / total) * 100) : 0
  const healthColor = healthPct >= 85 ? '#16a34a' : healthPct >= 70 ? '#d97706' : '#dc2626'
  const statusLine = breaches === 0
    ? 'All KPIs met or approved — no remediation required.'
    : `${breaches} KPI${breaches !== 1 ? 's' : ''} did not meet the required threshold. Your contract manager may be in touch regarding remediation.`

  await resend.emails.send({
    from: FROM,
    to,
    subject: `KPI review complete — ${contractName} (${periodLabel})`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; margin: 0; padding: 32px 16px;">
  <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden;">
    <div style="padding: 20px 28px; border-bottom: 1px solid #e5e7eb;">
      <div style="display: inline-flex; align-items: center; gap: 10px;">
        <div style="width: 28px; height: 28px; border-radius: 6px; background: #6366f1; display: inline-flex; align-items: center; justify-content: center;">
          <span style="color: white; font-weight: bold; font-size: 11px;">V</span>
        </div>
        <span style="font-weight: 600; font-size: 14px; color: #111827;">VericonIQ</span>
      </div>
    </div>
    <div style="padding: 32px 28px;">
      <p style="font-size: 15px; color: #374151; margin: 0 0 6px; font-weight: 600;">KPI review complete</p>
      <p style="font-size: 14px; color: #6b7280; margin: 0 0 24px; line-height: 1.6;">
        Your submission for <strong style="color: #374151;">${contractName}</strong> (${periodLabel}) has been reviewed and locked.
      </p>
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="font-size: 12px; color: #6b7280;">Health score</span>
          <span style="font-size: 12px; font-weight: 700; color: ${healthColor};">${healthPct}%</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="font-size: 12px; color: #6b7280;">KPIs met</span>
          <span style="font-size: 12px; font-weight: 600; color: #111827;">${met} / ${total}</span>
        </div>
        ${breaches > 0 ? `<div style="display: flex; justify-content: space-between; margin-bottom: 8px;"><span style="font-size: 12px; color: #6b7280;">Breaches</span><span style="font-size: 12px; font-weight: 600; color: #dc2626;">${breaches}</span></div>` : ''}
        ${exemptionsApproved > 0 ? `<div style="display: flex; justify-content: space-between;"><span style="font-size: 12px; color: #6b7280;">Exemptions approved</span><span style="font-size: 12px; font-weight: 600; color: #16a34a;">${exemptionsApproved}</span></div>` : ''}
      </div>
      <p style="font-size: 13px; color: #374151; margin: 0 0 24px; line-height: 1.6;">${statusLine}</p>
      <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 24px 0;">
      <p style="font-size: 11px; color: #d1d5db; margin: 0;">Sent by VericonIQ Contract Performance Platform</p>
    </div>
  </div>
</body>
</html>
    `.trim(),
  })
}

export async function sendSubmissionNotification({
  to,
  vendorName,
  contractName,
  periodLabel,
  breaches,
  exemptions,
  total,
  entered,
  resultsUrl,
}: {
  to: string
  vendorName: string
  contractName: string
  periodLabel: string
  breaches: number
  exemptions: number
  total: number
  entered: number
  resultsUrl: string
}) {
  const statusColor = breaches > 0 ? '#dc2626' : '#16a34a'
  const statusText = breaches > 0 ? `${breaches} breach${breaches !== 1 ? 'es' : ''}` : 'All KPIs met'

  await resend.emails.send({
    from: FROM,
    to,
    subject: `KPI submission received — ${vendorName} · ${contractName}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; margin: 0; padding: 32px 16px;">
  <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden;">
    <div style="padding: 20px 28px; border-bottom: 1px solid #e5e7eb;">
      <div style="display: inline-flex; align-items: center; gap: 10px;">
        <div style="width: 28px; height: 28px; border-radius: 6px; background: #6366f1; display: inline-flex; align-items: center; justify-content: center;">
          <span style="color: white; font-weight: bold; font-size: 11px;">V</span>
        </div>
        <span style="font-weight: 600; font-size: 14px; color: #111827;">VericonIQ</span>
      </div>
    </div>
    <div style="padding: 32px 28px;">
      <p style="font-size: 15px; color: #374151; margin: 0 0 6px; font-weight: 600;">Vendor submission received</p>
      <p style="font-size: 14px; color: #6b7280; margin: 0 0 24px; line-height: 1.6;">
        <strong style="color: #374151;">${vendorName}</strong> has submitted KPI results for
        <strong style="color: #374151;">${contractName}</strong> — ${periodLabel}.
      </p>

      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="font-size: 12px; color: #6b7280;">KPIs entered</span>
          <span style="font-size: 12px; font-weight: 600; color: #111827;">${entered} / ${total}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="font-size: 12px; color: #6b7280;">Status</span>
          <span style="font-size: 12px; font-weight: 600; color: ${statusColor};">${statusText}</span>
        </div>
        ${exemptions > 0 ? `
        <div style="display: flex; justify-content: space-between;">
          <span style="font-size: 12px; color: #6b7280;">Exemptions claimed</span>
          <span style="font-size: 12px; font-weight: 600; color: #d97706;">${exemptions} pending review</span>
        </div>` : ''}
      </div>

      <a href="${resultsUrl}" style="display: inline-block; background: #6366f1; color: white; font-weight: 600; font-size: 14px; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
        Review results →
      </a>

      <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 24px 0;">
      <p style="font-size: 11px; color: #d1d5db; margin: 0;">Sent by VericonIQ Contract Performance Platform</p>
    </div>
  </div>
</body>
</html>
    `.trim(),
  })
}
