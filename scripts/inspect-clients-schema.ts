
import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase credentials")
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function main() {
    console.log("Inspecting 'clients' table columns...")
    const { data, error } = await supabase
        .rpc('get_table_columns', { table_name: 'clients' })

    // If RPC doesn't exist (it usually doesn't by default), try a direct query if possible,
    // or just select * from clients limit 0 to get keys.

    // Method 2: Select one row (or empty) and print keys.
    const { data: rows, error: selectError } = await supabase
        .from("clients")
        .select("*")
        .limit(1)

    if (selectError) {
        console.error("Error selecting from clients:", selectError)
    } else if (rows && rows.length > 0) {
        console.log("Columns found in a row:", Object.keys(rows[0]))
    } else {
        // If table is empty, we can't see columns via select
        console.log("Table is empty or no rows returned. Cannot infer columns from data.")
    }

    // Double check specific columns we care about
    const checkColumns = [
        "doc_status", "doc_processed_at", "doc_confidence", "doc_model",
        "doc_document_id", "doc_raw", "doc_error", "doc_type",
        "first_name", "date_of_birth", "nationality"
    ]

    console.log("\nChecking specific columns via separate selects (to see if they error):")
    for (const col of checkColumns) {
        const { error } = await supabase.from("clients").select(col).limit(1)
        if (error) {
            console.error(`Column '${col}' ISSUE:`, error.message)
        } else {
            console.log(`Column '${col}' OK`)
        }
    }
}

main()
