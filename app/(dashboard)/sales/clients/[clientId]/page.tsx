import { notFound } from "next/navigation"

import { SalesClientWorkspace } from "@/components/sales-client-workspace"
import { getLiveClientById } from "@/lib/data/live-data"

export default async function SalesClientDetailPage({ params }: { params: { clientId: string } }) {
  const client = await getLiveClientById(params.clientId)
  if (!client) {
    notFound()
  }
  return <SalesClientWorkspace client={client} />
}
