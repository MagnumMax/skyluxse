import { createClient } from "@supabase/supabase-js"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SystemLogLevel, SystemLogCategory } from "@/lib/system-log"

export const dynamic = "force-dynamic"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
    throw new Error("Missing Supabase credentials")
}

const supabase = createClient(supabaseUrl, serviceKey)

interface SystemLog {
    id: string
    created_at: string
    level: SystemLogLevel
    category: SystemLogCategory
    message: string
    metadata: Record<string, any>
    entity_id: string | null
    entity_type: string | null
}

function LevelBadge({ level }: { level: SystemLogLevel }) {
    const variants: Record<SystemLogLevel, "default" | "secondary" | "destructive" | "outline"> = {
        info: "secondary",
        warning: "default", // Using default (usually black/primary) for warning to stand out but not red
        error: "destructive",
        critical: "destructive",
    }
    
    // Override color classes if needed, but badge variants are standard
    const className = level === "warning" ? "bg-yellow-500 hover:bg-yellow-600" : undefined

    return <Badge variant={variants[level]} className={className}>{level}</Badge>
}

export default async function SystemLogsPage() {
    const { data: logs, error } = await supabase
        .from("system_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100)
    
    if (error) {
        console.error("Failed to fetch logs", error)
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">System Logs</h1>
                <p className="text-muted-foreground">
                    Audit trail of critical system events, errors, and integrations.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Events</CardTitle>
                    <CardDescription>Showing last 100 system logs.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[180px]">Timestamp</TableHead>
                                <TableHead className="w-[100px]">Level</TableHead>
                                <TableHead className="w-[100px]">Category</TableHead>
                                <TableHead>Message</TableHead>
                                <TableHead className="w-[150px]">Entity</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs?.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell className="font-mono text-xs text-muted-foreground">
                                        {new Date(log.created_at).toLocaleString()}
                                    </TableCell>
                                    <TableCell>
                                        <LevelBadge level={log.level} />
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="capitalize">{log.category}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium">{log.message}</div>
                                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                                            <pre className="mt-1 text-xs text-muted-foreground overflow-x-auto bg-slate-100 p-1 rounded max-w-xl">
                                                {JSON.stringify(log.metadata, null, 2)}
                                            </pre>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {log.entity_type && (
                                            <div className="text-xs">
                                                <span className="font-semibold">{log.entity_type}:</span> {log.entity_id}
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {!logs?.length && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                        No logs found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
