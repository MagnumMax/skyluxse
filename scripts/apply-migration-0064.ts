
import { Client } from 'pg'
import * as fs from 'fs'
import * as path from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function main() {
    // Try different common env var names for the connection string
    const databaseUrl = process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? process.env.SUPABASE_DB_URL
    if (!databaseUrl) {
        console.error('No database URL found in .env.local (checked DATABASE_URL, POSTGRES_URL, SUPABASE_DB_URL)')
        process.exit(1)
    }

    const client = new Client({
        connectionString: databaseUrl,
    })

    try {
        await client.connect()
        console.log('Connected to database.')

        const migrationFile = 'migrations/0064_force_single_driver_assignment.sql'
        const filePath = path.resolve(process.cwd(), migrationFile)

        if (!fs.existsSync(filePath)) {
            console.error(`Migration file not found: ${filePath}`)
            process.exit(1)
        }

        console.log(`Applying ${migrationFile}...`)
        const sql = fs.readFileSync(filePath, 'utf8')

        try {
            await client.query('BEGIN')
            await client.query(sql)
            await client.query('COMMIT')
            console.log(`Successfully applied ${migrationFile}`)
        } catch (err) {
            await client.query('ROLLBACK')
            console.error(`Failed to apply ${migrationFile}:`, err)
            process.exit(1)
        }

    } catch (err) {
        console.error('Database connection error:', err)
        process.exit(1)
    } finally {
        await client.end()
    }
}

main()
