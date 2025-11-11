import { NextRequest, NextResponse } from "next/server"

import { getDocumentRecordById } from "@/lib/data/live-data"

export async function GET(_: NextRequest, { params }: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await params
  const record = await getDocumentRecordById(documentId)
  if (!record) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 })
  }
  return NextResponse.json(record)
}
