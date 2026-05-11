import { anthropic, ANTHROPIC_MODEL } from './client'
import { contractExtractionPrompt } from './prompts/contract-extraction'

export type DocumentInput = {
  text: string
  docType: string
  hierarchyOrder: number
  name: string
}

export type ExtractedKPI = {
  name: string
  description: string | null
  kpi_type: 'contractual' | 'operational'
  category: string
  target_value: number | null
  target_operator: 'gte' | 'lte' | 'eq' | 'between'
  target_value_max: number | null
  unit: string | null
  unit_label: string | null
  cadence: 'weekly' | 'monthly' | 'quarterly' | 'annual'
  credit_formula: string | null
  credit_per_unit: number | null
  credit_percent_mrc: number | null
  credit_cap_percent: number | null
  credit_cap_amount: number | null
  clause_ref: string | null
  source_doc_type: string
}

export type ExtractedKeyTerm = {
  term_type: 'date' | 'obligation' | 'liability' | 'payment' | 'dispute' | 'termination'
  label: string
  value: string
  clause_ref: string | null
  is_ai_flagged: boolean
  flag_reason: string | null
}

export type ExtractionConflict = {
  description: string
  clause_ref_a: string
  clause_ref_b: string
  resolution: string
}

export type ExtractionResult = {
  kpis: ExtractedKPI[]
  key_terms: ExtractedKeyTerm[]
  conflicts: ExtractionConflict[]
  ai_notes: string
}

// Max documents per Claude call — keeps output well within token limits
const BATCH_SIZE = 3

function buildExtractionContext(
  documents: DocumentInput[],
  batchNum: number,
  totalBatches: number
): string {
  const sorted = [...documents].sort((a, b) => a.hierarchyOrder - b.hierarchyOrder)

  let context = `# CONTRACT DOCUMENTS — Batch ${batchNum} of ${totalBatches} (${sorted.length} documents)\n`
  if (totalBatches > 1) {
    context += `Note: This is part of a larger contract set being processed in batches. Extract all KPIs and terms found in these documents.\n`
  }
  context += `\n`

  for (const doc of sorted) {
    context += `---\n`
    context += `## ${doc.name}\n`
    context += `Type: ${doc.docType} | Hierarchy order: ${doc.hierarchyOrder}\n\n`
    const CHAR_LIMIT = 12000
    const truncated = doc.text.length > CHAR_LIMIT
      ? doc.text.slice(0, CHAR_LIMIT) + '\n\n[DOCUMENT TRUNCATED]'
      : doc.text
    context += truncated
    context += '\n\n'
  }

  return context
}

async function runBatchExtraction(
  documents: DocumentInput[],
  perspective: 'buyer' | 'vendor',
  batchNum: number,
  totalBatches: number
): Promise<ExtractionResult> {
  const context = buildExtractionContext(documents, batchNum, totalBatches)

  console.log(`[extraction] Running batch ${batchNum}/${totalBatches} — ${documents.length} documents`)

  const stream = await anthropic.messages.stream({
    model: ANTHROPIC_MODEL,
    max_tokens: 10000,
    system: contractExtractionPrompt({ perspective }),
    messages: [{ role: 'user', content: context }],
  })

  const response = await stream.finalMessage()
  const rawText = response.content[0].type === 'text' ? response.content[0].text : ''

  if (response.stop_reason === 'max_tokens') {
    console.warn(`[extraction] Batch ${batchNum}/${totalBatches} hit max_tokens — output may be truncated`)
  }

  console.log(`[extraction] Batch ${batchNum}/${totalBatches} complete — stop_reason: ${response.stop_reason}`)

  const jsonText = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  let parsed: ExtractionResult
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    console.error(`[extraction] Failed to parse batch ${batchNum}:`, rawText.slice(0, 500))
    throw new Error(`AI extraction batch ${batchNum} returned invalid JSON. Please try again.`)
  }

  if (!Array.isArray(parsed.kpis) || !Array.isArray(parsed.key_terms)) {
    throw new Error(`AI extraction batch ${batchNum} response missing required fields`)
  }

  return parsed
}

function mergeResults(results: ExtractionResult[]): ExtractionResult {
  const allKpis = results.flatMap(r => r.kpis)
  const allConflicts = results.flatMap(r => r.conflicts ?? [])

  // Deduplicate key terms by label — keep first occurrence
  // (docs are sorted by hierarchy so highest-precedence version comes first)
  const seenTermLabels = new Set<string>()
  const allKeyTerms: ExtractedKeyTerm[] = []
  for (const result of results) {
    for (const term of result.key_terms) {
      const key = term.label.toLowerCase().trim()
      if (!seenTermLabels.has(key)) {
        seenTermLabels.add(key)
        allKeyTerms.push(term)
      }
    }
  }

  const aiNotes = results
    .map((r, i) => `[Batch ${i + 1}] ${r.ai_notes}`)
    .join('\n\n')

  return {
    kpis: allKpis,
    key_terms: allKeyTerms,
    conflicts: allConflicts,
    ai_notes: aiNotes,
  }
}

export async function extractContractData(
  documents: DocumentInput[],
  perspective: 'buyer' | 'vendor' = 'buyer'
): Promise<ExtractionResult> {
  if (documents.length === 0) {
    throw new Error('No documents provided for extraction')
  }

  // Sort by hierarchy: amendments first (lowest order = highest precedence)
  const sorted = [...documents].sort((a, b) => a.hierarchyOrder - b.hierarchyOrder)

  // Split into batches
  const batches: DocumentInput[][] = []
  for (let i = 0; i < sorted.length; i += BATCH_SIZE) {
    batches.push(sorted.slice(i, i + BATCH_SIZE))
  }

  console.log(`[extraction] Starting extraction — ${documents.length} documents in ${batches.length} batch(es)`)

  if (batches.length === 1) {
    return runBatchExtraction(batches[0], perspective, 1, 1)
  }

  // Process batches sequentially to avoid rate limits
  const results: ExtractionResult[] = []
  for (let i = 0; i < batches.length; i++) {
    const result = await runBatchExtraction(batches[i], perspective, i + 1, batches.length)
    results.push(result)
  }

  return mergeResults(results)
}
