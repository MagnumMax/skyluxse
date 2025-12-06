
import { Client } from 'pg'
import * as fs from 'fs'
import * as path from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function main() {
    const databaseUrl = process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? process.env.SUPABASE_DB_URL ?? process.env.POSTGRES_PRISMA_URL
    if (!databaseUrl) {
        console.error('No database URL found in .env.local (checked DATABASE_URL, POSTGRES_URL, SUPABASE_DB_URL)')
        process.exit(1)
    }

    // console.log("Connecting to:", databaseUrl) // Don't log credentials!

    const client = new Client({
        connectionString: databaseUrl,
        // ssl: { rejectUnauthorized: false } // Only if needed for production/supabase
    })

    try {
        await client.connect()
        console.log('Connected to database.')

        const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations')

        const filesToApply = [
            '20251206120000_add_staff_external_crm_id.sql',
            '20251206120100_kommo_refresh_owner_mapping.sql',
            '20251206121000_add_bookings_mileage_limit.sql'
        ]

        for (const file of filesToApply) {
            const filePath = path.join(migrationsDir, file)
            if (!fs.existsSync(filePath)) {
                console.error(`Migration file not found: ${filePath}`)
                continue
            }

            console.log(`Applying ${file}...`)
            const sql = fs.readFileSync(filePath, 'utf8')

            try {
                await client.query('BEGIN')
                await client.query(sql)
                await client.query('COMMIT')
                console.log(`Successfully applied ${file}`)
            } catch (err) {
                await client.query('ROLLBACK')
                console.error(`Failed to apply ${file}:`, err)
                // Continue or break? Usually break if dependencies exist.
                // But these are somewhat independent. 
                // Let's break to be safe.
                process.exit(1)
            }
        }

    } catch (err) {
        console.error('Database connection error:', err)
    } finally {
        await client.end()
    }
}

main()
