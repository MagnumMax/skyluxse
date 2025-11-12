import { SalesClientsList } from "@/components/sales-clients-list"
import { getLiveClients } from "@/lib/data/live-data"

export default async function SalesClientsPage() {
  const clients = await getLiveClients()
  return <SalesClientsList clients={clients} />
}
