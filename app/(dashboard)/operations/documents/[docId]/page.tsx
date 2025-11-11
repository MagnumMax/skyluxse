import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { DocumentViewer, type ResolvedDocument } from "@/components/document-viewer"
import type { DocumentRecord } from "@/lib/data/live-data"
import { getDocumentRecordById } from "@/lib/data/live-data"

type PageProps = { params: { docId: string } }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const record = await getDocumentRecordById(params.docId)
  return {
    title: record ? `${record.name ?? record.type} · Document` : `Document ${params.docId}`,
  }
}

export default async function DocumentViewerPage({ params }: PageProps) {
  const record = await getDocumentRecordById(params.docId)
  if (!record) {
    notFound()
  }
  return <DocumentViewer doc={mapDocumentRecord(record)} />
}

function mapDocumentRecord(record: DocumentRecord): ResolvedDocument {
  return {
    id: record.id,
    name: record.name,
    type: record.type,
    status: record.status,
    expiry: record.expiry,
    previewUrl: record.previewUrl,
    entityLabel: record.entityLabel,
    entityLink: record.entityLink,
    entityType: record.entityType,
  }
}
