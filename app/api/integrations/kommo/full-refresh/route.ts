import { NextResponse } from 'next/server'
import { serviceClient } from '@/lib/supabase/service-client'

type RefreshRequest = {
  year?: number
  triggeredBy?: string
  from?: string
  to?: string
}

async function resolveUserId(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)
  if (!token) return null
  const { data, error } = await serviceClient.auth.getUser(token)
  if (error) {
    console.warn('[kommo-refresh] failed to resolve user from token', error.message)
    return null
  }
  return data.user?.id ?? null
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as RefreshRequest
    const year = body.year ?? 2025
    const userId = body.triggeredBy ?? (await resolveUserId(req))

    const { data, error } = await serviceClient.functions.invoke('kommo-full-refresh', {
      body: { year, triggeredBy: userId ?? null, from: body.from, to: body.to },
      headers: userId ? { 'x-user-id': userId } : undefined,
    })

    if (error) {
      console.error('[kommo-refresh] Edge Function error', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data ?? { status: 'queued' }, { status: 202 })
  } catch (error) {
    console.error('[kommo-refresh] unexpected error', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
