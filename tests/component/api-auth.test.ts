
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock server-only to avoid resolve errors in Vitest
vi.mock('server-only', () => ({}))

// Mock next/headers
vi.mock('next/headers', () => ({
  headers: vi.fn(),
}))

// Mock Supabase client to avoid real DB calls
vi.mock('@/lib/supabase/service-client', () => {
  const mockQueryBuilder: any = {
    select: vi.fn(),
    eq: vi.fn(),
    ilike: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
    order: vi.fn(),
    range: vi.fn(),
  };
  
  mockQueryBuilder.select.mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.eq.mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.ilike.mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.gte.mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.lte.mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.order.mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.range.mockResolvedValue({ data: [], error: null, count: 0 });

  return {
    serviceClient: {
      from: vi.fn().mockReturnValue(mockQueryBuilder),
    }
  }
})

import { headers } from 'next/headers'
import { validateApiKey } from '@/lib/auth/api-key'
import { GET } from '@/app/api/cars/route'

describe('API Auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CHATBOT_API_KEY = 'test-secret-key'
  })

  it('validateApiKey returns true when key is correct', async () => {
    (headers as any).mockResolvedValue(new Map([['x-api-key', 'test-secret-key']]))
    const result = await validateApiKey()
    expect(result).toBe(true)
  })

  it('validateApiKey returns false when key is wrong', async () => {
    (headers as any).mockResolvedValue(new Map([['x-api-key', 'wrong-key']]))
    const result = await validateApiKey()
    expect(result).toBe(false)
  })

  it('validateApiKey returns false when key is missing', async () => {
    (headers as any).mockResolvedValue(new Map([]))
    const result = await validateApiKey()
    expect(result).toBe(false)
  })

  it('GET /api/cars returns 401 if unauthorized', async () => {
    // Mock headers for the route call
    (headers as any).mockResolvedValue(new Map([]))
    
    const request = new Request('http://localhost/api/cars')
    const response = await GET(request)
    
    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBe("Unauthorized")
  })

  it('GET /api/cars returns 200 if authorized', async () => {
    // Mock headers for the route call
    (headers as any).mockResolvedValue(new Map([['x-api-key', 'test-secret-key']]))
    
    const request = new Request('http://localhost/api/cars')
    const response = await GET(request)
    
    expect(response.status).toBe(200)
  })
})
