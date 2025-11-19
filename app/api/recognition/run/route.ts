import { NextResponse } from "next/server"

import { recognizeLatestClientDocument } from "@/lib/ai/document-recognition"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const { clientId, force, allowProFallback } = await req.json()
    if (!clientId) {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 })
    }

    const result = await recognizeLatestClientDocument(clientId, {
      force: Boolean(force),
      allowProFallback: allowProFallback !== false,
    })

    return NextResponse.json({ ok: true, result })
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 })
  }
}
