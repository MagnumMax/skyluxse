import { NextRequest, NextResponse } from "next/server"

import { getClientNotifications } from "@/lib/data/live-data"

export async function GET(_: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params
  const notifications = await getClientNotifications(clientId)
  return NextResponse.json({ notifications })
}
