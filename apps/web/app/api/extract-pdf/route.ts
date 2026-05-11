import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import pdfParse from 'pdf-parse'

export async function POST(req: NextRequest) {
  try {
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

    const body = await req.json()
    const { storagePath, documentId } = body as {
      storagePath: string
      documentId: string
    }

    if (!storagePath || !documentId) {
      return NextResponse.json(
        { error: 'Missing storagePath or documentId' },
        { status: 400 }
      )
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: fileData, error } = await adminClient.storage
      .from('contracts')
      .download(storagePath)

    if (error || !fileData) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const buffer = Buffer.from(await fileData.arrayBuffer())
    const parsed = await pdfParse(buffer)

    return NextResponse.json({ text: parsed.text, pageCount: parsed.numpages })
  } catch (err) {
    console.error('[extract-pdf] Error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
