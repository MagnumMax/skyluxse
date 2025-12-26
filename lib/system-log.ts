import { serviceClient } from "@/lib/supabase/service-client"

export type SystemLogLevel = "info" | "warning" | "error" | "critical"
export type SystemLogCategory = "system" | "kommo" | "zoho" | "auth" | "booking" | "task"

interface LogSystemEventParams {
    level: SystemLogLevel
    category: SystemLogCategory
    message: string
    metadata?: Record<string, any>
    entityId?: string
    entityType?: string
}

export async function logSystemEvent(params: LogSystemEventParams) {
    const { level, category, message, metadata, entityId, entityType } = params

    // 1. Console Log (for Vercel/System logs)
    const logFn = level === "error" || level === "critical" ? console.error : 
                  level === "warning" ? console.warn : console.log
    
    logFn(`[${category.toUpperCase()}] ${message}`, { metadata, entityId, entityType })

    // 2. Database Log (Fire and forget to not block execution)
    serviceClient
        .from("system_logs")
        .insert({
            level,
            category,
            message,
            metadata: metadata ?? {},
            entity_id: entityId,
            entity_type: entityType
        })
        .then(({ error }) => {
            if (error) {
                console.error("Failed to write to system_logs", error)
            }
        }, (err) => {
             console.error("Exception writing to system_logs", err)
        })
}
