import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

async function main() {
  const baseUrl = process.env.KOMMO_BASE_URL
  const token = process.env.KOMMO_ACCESS_TOKEN
  if (!baseUrl || !token) {
    console.error("Missing Kommo Env Vars")
    process.exit(1)
  }
  const base = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl
  const url = `${base}/api/v4/leads/pipelines?with=statuses`
  console.log("Fetching pipelines from:", url)
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  })
  if (!resp.ok) {
    console.error("HTTP", resp.status, await resp.text())
    process.exit(1)
  }
  const data = await resp.json()
  const pipelines = Array.isArray(data?._embedded?.pipelines) ? data._embedded.pipelines : []
  for (const p of pipelines) {
    console.log(`Pipeline ${p.id} "${p.name}"`)
    const statuses = Array.isArray(p?._embedded?.statuses) ? p._embedded.statuses : []
    for (const s of statuses) {
      console.log(`  Status ${s.id} "${s.name}"`)
    }
  }
}

main().catch((err) => {
  console.error("Unexpected error", err instanceof Error ? err.message : String(err))
  process.exit(1)
})

