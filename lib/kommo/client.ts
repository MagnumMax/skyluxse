
export async function updateKommoLeadStatus(leadId: string, statusId: string) {
    const KOMMO_BASE_URL = process.env.KOMMO_BASE_URL
    const KOMMO_ACCESS_TOKEN = process.env.KOMMO_ACCESS_TOKEN

    if (!KOMMO_BASE_URL || !KOMMO_ACCESS_TOKEN) {
        console.error("Missing Kommo Env Vars")
        return { success: false, error: "Missing Kommo credentials" }
    }

    const url = `${KOMMO_BASE_URL}/api/v4/leads/${leadId}`
    
    try {
        const response = await fetch(url, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${KOMMO_ACCESS_TOKEN}`,
            },
            body: JSON.stringify({
                status_id: Number(statusId),
            }),
        })

        if (!response.ok) {
            const text = await response.text()
            console.error(`Failed to update Kommo lead ${leadId} status to ${statusId}: ${response.status} ${text}`)
            return { success: false, error: `Kommo API error: ${response.status}` }
        }

        const data = await response.json()
        return { success: true, data }
    } catch (error) {
        console.error("Error updating Kommo lead status:", error)
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
    }
}
