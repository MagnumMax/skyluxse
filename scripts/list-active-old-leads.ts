import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const KOMMO_BASE_URL = process.env.KOMMO_BASE_URL
const KOMMO_ACCESS_TOKEN = process.env.KOMMO_ACCESS_TOKEN

const ACTIVE_STATUSES = [
  75440383, // Incoming Leads
  79790631, // Request Bot Answering
  91703923, // Follow Up
  96150292, // Waiting for Payment
  98035992, // Sales order sent
  75440391, // Confirmed Bookings
  75440395, // Delivery Within 24 Hours
  75440399, // Car with Customers
  76475495, // Pick Up Within 24 Hours
  78486287  // Objections
]

async function kommoFetch(url: string) {
  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${KOMMO_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
  })
  if (!resp.ok) {
    throw new Error(`Kommo request failed (${resp.status}): ${await resp.text()}`)
  }
  return resp.json()
}

async function main() {
  if (!KOMMO_BASE_URL || !KOMMO_ACCESS_TOKEN) {
    console.error("Missing Kommo Env Vars")
    process.exit(1)
  }

  const now = new Date()
  const oneMonthAgo = new Date(now.setMonth(now.getMonth() - 1))
  console.log(`Checking for active leads older than: ${oneMonthAgo.toISOString()}`)

  let totalFound = 0
  let totalProcessed = 0

  for (const statusId of ACTIVE_STATUSES) {
    console.log(`\nFetching leads for status: ${statusId}`)
    let page = 1
    let hasNext = true

    while (hasNext) {
      const urlObj = new URL(`${KOMMO_BASE_URL}/api/v4/leads`)
      urlObj.searchParams.set("limit", "250")
      urlObj.searchParams.set("page", page.toString())
      urlObj.searchParams.set("filter[statuses][0][status_id]", statusId.toString())
      urlObj.searchParams.set("order[created_at]", "desc")

      try {
        const data = await kommoFetch(urlObj.toString())
        const leads = data?._embedded?.leads || []
        
        if (leads.length === 0) {
          hasNext = false
          break
        }

        let oldLeadsInPage = 0
        for (const lead of leads) {
          const createdAt = new Date(lead.created_at * 1000)
          if (createdAt < oneMonthAgo) {
            console.log(`Found Lead: ${lead.id} | Status: ${lead.status_id} | Created: ${createdAt.toISOString()}`)
            totalFound++
            oldLeadsInPage++
          }
        }
        
        // If we found 0 old leads in this page, and we are ordering by DESC,
        // it means all leads in this page are NEWER than oneMonthAgo.
        // But we might eventually reach older leads in subsequent pages.
        // Wait, if order is DESC (newest first), we start with 2025-12.
        // We want leads < 2025-11.
        // So we will see many leads > 2025-11 first. We must continue until we hit the date.
        
        // Check if the OLDEST lead in this page is still newer than cutoff.
        const oldestInPage = new Date(leads[leads.length - 1].created_at * 1000)
        if (oldestInPage > oneMonthAgo) {
            // Need to dig deeper
        } else {
            // We started finding old leads, or at least some in this page are old.
        }

        if (!data?._links?.next) {
          hasNext = false
        } else {
          page++
          // Safety break
          if (page > 50) {
              console.log("Reached page limit 50, stopping for this status")
              hasNext = false
          }
        }

      } catch (err) {
        console.error("Error fetching page:", err)
        hasNext = false
      }
    }
  }

  console.log(`\nTotal leads found older than ${oneMonthAgo.toISOString()}: ${totalFound}`)
}

main()
