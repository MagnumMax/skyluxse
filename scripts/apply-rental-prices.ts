
import * as fs from 'fs'
import * as path from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function main() {
    console.log("Starting migration via Supabase Management API...")

    const projectRef = "bylxzpvyzvycrpkwxvle"
    const accessToken = process.env.SUPABASE_ACCESS_TOKEN

    if (!accessToken) {
        console.error("Missing SUPABASE_ACCESS_TOKEN env var")
        process.exit(1)
    }

    const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations')
    const file = '20251224000000_add_rental_prices.sql'
    const filePath = path.join(migrationsDir, file)

    if (!fs.existsSync(filePath)) {
        console.error(`Migration file not found: ${filePath}`)
        process.exit(1)
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
        console.log(`Successfully executed ${file}`)
    }
}

main()
