
import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const KOMMO_BASE_URL = process.env.KOMMO_BASE_URL
const KOMMO_ACCESS_TOKEN = process.env.KOMMO_ACCESS_TOKEN

if (!KOMMO_BASE_URL || !KOMMO_ACCESS_TOKEN) {
    console.error("Missing Kommo Env Vars")
    process.exit(1)
}

const serviceClient = createClient(supabaseUrl, supabaseServiceKey)

async function main() {
    console.log("Starting Staff Sync from Kommo...")

    // 1. Fetch Kommo Users
    const usersUrl = `${KOMMO_BASE_URL}/api/v4/users`
    console.log("Fetching Kommo users from:", usersUrl)

    const resp = await fetch(usersUrl, {
        headers: { Authorization: `Bearer ${KOMMO_ACCESS_TOKEN}` }
    })

    if (!resp.ok) {
        console.error("Failed to fetch Kommo users", resp.status, await resp.text())
        return
    }

    const data = await resp.json()
    const kommoUsers = data._embedded?.users || []
    console.log(`Found ${kommoUsers.length} users in Kommo.`)

    // 2. Fetch Staff Accounts
    const { data: staff, error } = await serviceClient
        .from("staff_accounts")
        .select("*")

    if (error) {
        console.error("Failed to fetch staff accounts", error)
        return
    }
    console.log(`Found ${staff.length} staff accounts in DB.`)

    // 3. Match and Update
    let matched = 0
    let updated = 0

    for (const kUser of kommoUsers) {
        const kEmail = kUser.email?.toLowerCase().trim()
        const kName = kUser.name
        const kId = String(kUser.id)

        if (!kEmail) {
            // Helper logic if email is missing in Kommo (unlikely for users)
            console.warn(`Kommo user ${kId} (${kName}) has no email. Skipping.`)
            continue
        }

        // Find by Email
        const staffMember = staff.find(s => s.email?.toLowerCase().trim() === kEmail)

        if (staffMember) {
            console.log(`MATCH found: Kommo(${kEmail}) -> Staff(${staffMember.email}) ID:${staffMember.id}`)
            matched++

            if (staffMember.external_crm_id !== kId) {
                const { error: upError } = await serviceClient
                    .from("staff_accounts")
                    .update({ external_crm_id: kId })
                    .eq("id", staffMember.id)

                if (upError) {
                    console.error(`Failed to update staff ${staffMember.id}`, upError)
                } else {
                    console.log(`Updated staff ${staffMember.email} with external_crm_id=${kId}`)
                    updated++
                }
            } else {
                console.log(`Staff ${staffMember.email} already has correct ID.`)
            }
        } else {
            console.log(`Creating new staff account for Kommo User: ${kName} (${kEmail})`)

            // 1. Create Auth User
            const { data: authUser, error: authError } = await serviceClient.auth.admin.createUser({
                email: kEmail,
                password: "TemporaryPassword123!", // User will reset later
                email_confirm: true,
                user_metadata: { full_name: kName }
            })

            if (authError) {
                // If user exists in Auth but not in Staff?
                if (authError.message.includes("already registered")) {
                    console.warn(`User ${kEmail} exists in Auth but not in Staff table. Trying to find ID...`)
                    // Need to fetch user ID
                    const { data: listData } = await serviceClient.auth.admin.listUsers()
                    const existing = listData.users.find(u => u.email === kEmail)
                    if (existing) {
                        // proceed to insert staff with existing ID
                        const { error: insError } = await serviceClient
                            .from("staff_accounts")
                            .insert({
                                id: existing.id,
                                email: kEmail,
                                full_name: kName, // Schema uses full_name, not first/last
                                external_crm_id: kId,
                                role: 'operations'
                            })
                        if (insError) console.error("Failed to link auth user to staff", insError)
                        else updated++
                    }
                } else {
                    console.error(`Failed to create auth user for ${kEmail}`, authError)
                }
                continue
            }

            if (!authUser.user) {
                console.error("Auth user creation returned no user object")
                continue
            }

            // 2. Insert Staff Profile
            const { error: insError } = await serviceClient
                .from("staff_accounts")
                .insert({
                    id: authUser.user.id,
                    email: kEmail,
                    full_name: kName,
                    external_crm_id: kId,
                    role: 'operations'
                })

            if (insError) {
                console.error(`Failed to create staff profile for ${kEmail}`, insError)
            } else {
                updated++
                console.log(`Created Staff & Auth for ${kEmail}`)
            }
        }
    }

    console.log(`Sync Complete. Matched: ${matched}, Updated: ${updated}`)
}

main()
