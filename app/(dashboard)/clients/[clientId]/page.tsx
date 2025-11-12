import { notFound } from "next/navigation"

import { SalesClientWorkspace } from "@/components/sales-client-workspace"
import { getLiveClientById } from "@/lib/data/live-data"

type PageProps = { params: Promise<{ clientId: string }> }

export default async function SalesClientDetailPage({ params }: PageProps) {
  const { clientId } = await params
  const client = await getLiveClientById(clientId)
  if (!client) {
    notFound()
  }
  return <SalesClientWorkspace client={client} />
}
