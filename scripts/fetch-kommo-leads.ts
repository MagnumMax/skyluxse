import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

async function main() {
  const KOMMO_BASE_URL = process.env.KOMMO_BASE_URL
  const KOMMO_ACCESS_TOKEN = process.env.KOMMO_ACCESS_TOKEN

  if (!KOMMO_BASE_URL || !KOMMO_ACCESS_TOKEN) {
    console.error("Missing Kommo Env Vars")
    process.exit(1)
  }

  const base = KOMMO_BASE_URL.endsWith("/") ? KOMMO_BASE_URL.slice(0, -1) : KOMMO_BASE_URL
  const url = `${base}/api/v4/leads?limit=5&with=contacts,source_id&order[created_at]=desc`
  console.log("Fetching leads from:", `${base}/api/v4/leads`)

  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${KOMMO_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
  })

  if (!resp.ok) {
    console.error("HTTP", resp.status, await resp.text())
    process.exit(1)
  }

  const data = await resp.json()
  const leads = Array.isArray(data?._embedded?.leads) ? data._embedded.leads : []
  console.log("Fetched", leads.length, "leads")

  for (const lead of leads) {
    const id = lead?.id
    const name = String(lead?.name ?? "")
    const status = lead?.status_id
    const pipeline = lead?.pipeline_id
    const createdAt =
      typeof lead?.created_at === "number"
        ? new Date(lead.created_at * 1000).toISOString()
        : null
    console.log(
      `lead=${id} name="${name}" status=${status} pipeline=${pipeline} created=${createdAt}`
    )
  }
}

main().catch((err) => {
  console.error("Unexpected error", err instanceof Error ? err.message : String(err))
  process.exit(1)
})

