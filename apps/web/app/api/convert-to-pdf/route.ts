export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import mammoth from 'mammoth'
import PDFDocument from 'pdfkit'

/**
 * POST /api/convert-to-pdf
 *
 * Accepts a multipart/form-data upload with a single `file` field (.docx).
 * Converts the document to a text-preserving PDF and returns the PDF as a
 * binary response.
 *
 * The client then uploads the returned PDF blob to Supabase Storage.
 */
export async function POST(req: NextRequest) {
  try {
    // ── Auth check ──────────────────────────────────────────────────────────
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
            )
          },
        },
      }
    )
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── Parse multipart form ─────────────────────────────────────────────────
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const fileName = file.name.toLowerCase()
    if (fileName.endsWith('.doc') && !fileName.endsWith('.docx')) {
      return NextResponse.json(
        { error: 'Legacy .doc format is not supported. Open in Word and Save As .docx first.' },
        { status: 400 }
      )
    }
    if (!fileName.endsWith('.docx')) {
      return NextResponse.json(
        { error: 'Only .docx files are supported for Word conversion' },
        { status: 400 }
      )
    }

    // ── Extract text from Word document ──────────────────────────────────────
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let extractedText: string
    try {
      const result = await mammoth.extractRawText({ buffer })
      extractedText = result.value
    } catch (mammothErr) {
      const msg = mammothErr instanceof Error ? mammothErr.message : String(mammothErr)
      // DOCX files are ZIP archives — this error means the file is actually an
      // old binary .doc renamed to .docx, or is genuinely corrupted
      if (msg.includes('zip') || msg.includes('central directory') || msg.includes('End of central')) {
        return NextResponse.json(
          {
            error:
              'This file appears to be an old Word 97–2003 (.doc) format renamed to .docx. ' +
              'Open it in Word, choose File → Save As → Word Document (.docx), then re-upload the saved copy.',
          },
          { status: 422 }
        )
      }
      return NextResponse.json(
        { error: `Could not read Word file: ${msg}` },
        { status: 422 }
      )
    }

    if (!extractedText.trim()) {
      return NextResponse.json(
        { error: 'The document appears to be empty or contains no readable text.' },
        { status: 422 }
      )
    }

    // ── Build PDF from extracted text ─────────────────────────────────────────
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 60, bottom: 60, left: 72, right: 72 },
        info: {
          Title: file.name.replace(/\.(docx?|DOC[X]?)$/, ''),
          Creator: 'Contractly',
        },
      })

      const chunks: Buffer[] = []
      doc.on('data', (chunk: Buffer) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      // Write text — split on double newlines to preserve paragraph spacing
      const paragraphs = extractedText.split(/\n{2,}/)
      paragraphs.forEach((para: string, i: number) => {
        const cleaned = para.trim()
        if (!cleaned) return
        doc.fontSize(10.5).font('Helvetica').text(cleaned, {
          align: 'left',
          lineGap: 2,
        })
        if (i < paragraphs.length - 1) {
          doc.moveDown(0.6)
        }
      })

      doc.end()
    })

    // ── Return PDF blob ───────────────────────────────────────────────────────
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${file.name.replace(/\.docx?$/i, '.pdf')}"`,
        'Content-Length': String(pdfBuffer.length),
      },
    })
  } catch (err) {
    console.error('[convert-to-pdf]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Conversion failed' },
      { status: 500 }
    )
  }
}
