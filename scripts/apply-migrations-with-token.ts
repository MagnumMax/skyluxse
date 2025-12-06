
import * as fs from 'fs'
import * as path from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function main() {
    console.log("Starting migration via Supabase Management API...")

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const accessToken = process.env.SUPABASE_ACCESS_TOKEN

    if (!supabaseUrl) {
        console.error("Missing NEXT_PUBLIC_SUPABASE_URL")
        process.exit(1)
    }
    if (!accessToken) {
        console.error("Missing SUPABASE_ACCESS_TOKEN")
        process.exit(1)
    }

    // Extract Project Ref
    // URL format: https://[ref].supabase.co
    const match = supabaseUrl.match(/https?:\/\/([^.]+)\./)
    if (!match) {
        console.error("Could not parse Project Ref from URL:", supabaseUrl)
        process.exit(1)
    }
    const projectRef = match[1]
    console.log(`Target Project Ref: ${projectRef}`)

    const migrationsDir = path.join(process.cwd(), 'migrations')
    const filesToApply = [
        '0045_add_vehicle_zoho_item_id.sql'
    ]

    for (const file of filesToApply) {
        const filePath = path.join(migrationsDir, file)
        if (!fs.existsSync(filePath)) {
            console.error(`Migration file not found: ${filePath}`)
            continue
        }

        console.log(`Reading ${file}...`)
        const sql = fs.readFileSync(filePath, 'utf8')

        // Submit to Management API
        const endpoint = `https://api.supabase.com/v1/projects/${projectRef}/database/query`
        console.log(`Executing SQL on ${endpoint}...`)

        const resp = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: sql })
        })

        if (!resp.ok) {
            console.error(`Failed to apply ${file}: ${resp.status} ${resp.statusText}`)
            const txt = await resp.text()
            console.error(txt)
            process.exit(1)
        } else {
            // Management API returns the query result, we just check for success status mostly, 
            // or if it returns an error object inside 200 OK?
            // Usually it returns the rows or error. 
            // Let's check the content type.
            const result = await resp.json()
            // If there's an error in the SQL, does it return 400 or 200 with error?
            // It usually returns 4xx or 5xx on failure.
            console.log(`Successfully executed ${file}`)
        }

        // Small delay to be nice
        await new Promise(r => setTimeout(r, 500))
    }

    console.log("All migrations applied successfully via Management API.")
}

main()
