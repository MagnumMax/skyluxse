
console.log("Script starting...")
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const BASE_URL = 'https://skyluxse.vercel.app'
const API_KEY = process.env.CHATBOT_API_KEY

console.log("Environment loaded.")

if (!API_KEY) {
    console.error("Missing CHATBOT_API_KEY in .env.local")
    process.exit(1)
}

async function testEndpoint(name: string, path: string) {
    console.log(`\nTesting ${name} (${path})...`)
    const url = `${BASE_URL}${path}`
    
    try {
        const start = performance.now()
        const res = await fetch(url, {
            headers: {
                'x-api-key': API_KEY!
            }
        })
        const duration = Math.round(performance.now() - start)
        
        console.log(`Status: ${res.status} ${res.statusText} (${duration}ms)`)
        
        if (res.ok) {
            const data = await res.json()
            console.log("Response Preview:")
            console.log(JSON.stringify(data, null, 2).slice(0, 500) + (JSON.stringify(data).length > 500 ? "\n... (truncated)" : ""))
            return true
        } else {
            const text = await res.text()
            console.error("Error Body:", text)
            return false
        }
    } catch (err) {
        console.error("Fetch failed:", err)
        return false
    }
}

async function main() {
    console.log(`Target: ${BASE_URL}`)
    console.log(`Using Key: ${API_KEY?.slice(0, 5)}...`)

    // 1. Test List
    const listOk = await testEndpoint('Get Fleet', '/api/cars?limit=2')
    
    // 2. Test Available
    // Dates: tomorrow to day after tomorrow
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    const dayAfter = new Date(today)
    dayAfter.setDate(today.getDate() + 2)
    
    const d1 = tomorrow.toISOString().split('T')[0]
    const d2 = dayAfter.toISOString().split('T')[0]
    
    const availOk = await testEndpoint('Check Availability', `/api/cars/available?date_from=${d1}&date_to=${d2}`)

    // 3. Test Unauthorized (negative test)
    console.log(`\nTesting Unauthorized Access...`)
    try {
        const res = await fetch(`${BASE_URL}/api/cars`, { headers: {} }) // No key
        console.log(`Status: ${res.status} (Expected 401)`)
    } catch (err) {
        console.error(err)
    }
}

main()
