import type { NextFixture } from "next/experimental/testmode/playwright"

const JSON_HEADERS = {
  "content-type": "application/json",
}

type SupabaseMockOptions = {
  handler?: (url: URL, request: Request) => Response | undefined
  tables?: Record<string, unknown[]>
}

function defaultSupabaseResponse(pathname: string) {
  const isRest = pathname.includes("/rest/")
  const body = isRest ? "[]" : "{}"
  return jsonResponse(body)
}

function jsonResponse(body: string | unknown) {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    headers: {
      ...JSON_HEADERS,
      "x-mock-source": "registerSupabaseMocks",
    },
  })
}

function extractTableName(pathname: string): string | null {
  const marker = "/rest/v1/"
  const index = pathname.indexOf(marker)
  if (index === -1) return null
  const remainder = pathname.slice(index + marker.length)
  const match = remainder.match(/^([a-zA-Z0-9_\-]+)/)
  return match ? match[1] : null
}

export function registerSupabaseMocks(next: NextFixture, options?: SupabaseMockOptions) {
  next.onFetch((request) => {
    const url = new URL(request.url)

    if (url.hostname.includes("supabase")) {
      const custom = options?.handler?.(url, request)
      if (custom) return custom

      const table = extractTableName(url.pathname)
      if (table && options?.tables?.[table]) {
        return jsonResponse(options.tables[table])
      }

      return defaultSupabaseResponse(url.pathname)
    }

    return undefined
  })
}
