/**
 * Backfill result_type on existing KPIs using AI classification.
 *
 * Classifies each KPI as 'binary' (outcome is simply met or not met)
 * or 'numeric' (measured by a number).
 *
 * Run: npx tsx scripts/backfill-result-type.ts
 * From the repo root.
 */

import postgres from 'postgres'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set. Export it (or source .env.local) before running.')

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set. Export it (or source .env.local) before running.')

const sql = postgres(DATABASE_URL, { ssl: 'require', max: 1 })

const BATCH_SIZE = 30

type KpiRow = {
  id: string
  name: string
  category: string | null
  unit_label: string | null
  target_value: string | null
  target_operator: string
  result_type: string
}

async function classifyBatch(kpis: KpiRow[]): Promise<Record<string, 'numeric' | 'binary'>> {
  const items = kpis.map((k, i) =>
    `${i + 1}. "${k.name}" | category: ${k.category ?? 'general'} | unit: ${k.unit_label ?? 'none'} | target: ${k.target_value ?? 'none'} ${k.target_operator}`
  ).join('\n')

  const prompt = `Classify each KPI as either "numeric" or "binary".

Rules:
- binary = outcome is simply met or not met (e.g. "Report submitted", "Audit passed", "Register maintained", "Certification held", "Plan in place")
- numeric = measured by a quantity (%, hours, count, $, score, incidents, days)

When in doubt, prefer numeric. Only mark binary when the KPI is clearly a yes/no obligation.

KPIs to classify:
${items}

Respond with ONLY a JSON object mapping the number to the result type, e.g.:
{"1":"binary","2":"numeric","3":"binary"}`

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`Anthropic API error ${resp.status}: ${err}`)
  }

  const data = await resp.json() as { content: Array<{ type: string; text: string }> }
  const text = data.content[0]?.type === 'text' ? data.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error(`No JSON in response: ${text}`)

  const parsed: Record<string, string> = JSON.parse(jsonMatch[0])
  const result: Record<string, 'numeric' | 'binary'> = {}

  kpis.forEach((k, i) => {
    const val = parsed[String(i + 1)]
    result[k.id] = val === 'binary' ? 'binary' : 'numeric'
  })

  return result
}

async function main() {
  console.log('Fetching KPIs...')

  const kpis = await sql<KpiRow[]>`
    SELECT id, name, category, unit_label, target_value, target_operator, result_type
    FROM kpis
    WHERE is_active = true
    ORDER BY name
  `

  console.log(`Found ${kpis.length} active KPIs`)

  if (kpis.length === 0) {
    console.log('Nothing to do.')
    await sql.end()
    return
  }

  let updated = 0
  let binary = 0
  let numeric = 0

  for (let i = 0; i < kpis.length; i += BATCH_SIZE) {
    const batch = kpis.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(kpis.length / BATCH_SIZE)

    console.log(`\nBatch ${batchNum}/${totalBatches} (${batch.length} KPIs)...`)

    try {
      const classifications = await classifyBatch(batch)

      for (const [id, resultType] of Object.entries(classifications)) {
        const kpi = batch.find(k => k.id === id)
        const mark = resultType === 'binary' ? '🔘' : '🔢'
        console.log(`  ${mark} ${resultType.padEnd(7)} — ${kpi?.name}`)

        await sql`
          UPDATE kpis SET result_type = ${resultType} WHERE id = ${id}
        `
        updated++
        if (resultType === 'binary') binary++
        else numeric++
      }
    } catch (err) {
      console.error(`  ❌ Batch ${batchNum} failed:`, err)
    }

    // Brief pause between batches to respect rate limits
    if (i + BATCH_SIZE < kpis.length) {
      await new Promise(r => setTimeout(r, 1000))
    }
  }

  console.log(`\n✅ Done — updated ${updated} KPIs (${binary} binary, ${numeric} numeric)`)
  await sql.end()
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
