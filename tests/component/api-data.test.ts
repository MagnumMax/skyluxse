
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock server-only
vi.mock('server-only', () => ({}))

// Mock headers to allow auth
vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Map([['x-api-key', 'test-secret-key']])),
}))

// Mock Supabase client
const { mockQueryBuilder, mockMethods } = vi.hoisted(() => {
  const mockSelect = vi.fn()
  const mockEq = vi.fn()
  const mockIlike = vi.fn()
  const mockGte = vi.fn()
  const mockLte = vi.fn()
  const mockOrder = vi.fn()
  const mockRange = vi.fn()
  const mockSingle = vi.fn()
  const mockLimit = vi.fn()
  const mockNeq = vi.fn()
  const mockNot = vi.fn()

  const builder = {
    select: mockSelect,
    eq: mockEq,
    ilike: mockIlike,
    gte: mockGte,
    lte: mockLte,
    order: mockOrder,
    range: mockRange,
    single: mockSingle,
    limit: mockLimit,
    neq: mockNeq,
    not: mockNot,
  }

  // Chainable mocks setup
  mockSelect.mockReturnValue(builder)
  mockEq.mockReturnValue(builder)
  mockIlike.mockReturnValue(builder)
  mockGte.mockReturnValue(builder)
  mockLte.mockReturnValue(builder)
  mockOrder.mockReturnValue(builder)
  mockNeq.mockReturnValue(builder)
  mockNot.mockReturnValue(builder)
  mockLimit.mockReturnValue(builder)

  return { 
    mockQueryBuilder: builder,
    mockMethods: {
        mockSelect, mockEq, mockIlike, mockGte, mockLte, 
        mockOrder, mockRange, mockSingle, mockLimit, mockNeq, mockNot
    }
  }
})

vi.mock('@/lib/supabase/service-client', () => ({
  serviceClient: {
    from: vi.fn().mockReturnValue(mockQueryBuilder),
  }
}))

import { GET as getCars } from '@/app/api/cars/route'
import { GET as getCarDetails } from '@/app/api/cars/[id]/route'
import { GET as getAvailableCars } from '@/app/api/cars/available/route'

describe('API Data Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CHATBOT_API_KEY = 'test-secret-key'
    
    // Default mock returns
    mockMethods.mockRange.mockResolvedValue({ data: [], error: null, count: 0 })
    mockMethods.mockSingle.mockResolvedValue({ data: null, error: null })
  })

  describe('GET /api/cars', () => {
    it('returns list of cars with correct mapping', async () => {
      const mockVehicles = [
        {
          id: 'v1',
          make: 'Audi',
          model: 'Q8',
          model_year: 2023,
          seating_capacity: 5,
          rental_prices: { daily: 1000 },
          utilization_pct: 0.8
        }
      ]
      
      mockMethods.mockRange.mockResolvedValue({ data: mockVehicles, error: null, count: 1 })

      const request = new Request('http://localhost/api/cars?limit=10')
      const response = await getCars(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data).toHaveLength(1)
      expect(json.data[0]).toMatchObject({
        id: 'v1',
        car: 'Audi',
        model: 'Q8',
        year: 2023,
        prices: { daily: 1000 }
      })
    })

    it('applies filters correctly', async () => {
        mockMethods.mockRange.mockResolvedValue({ data: [], error: null, count: 0 })
  
        const request = new Request('http://localhost/api/cars?car=BMW&minDailyPrice=500')
        await getCars(request)
  
        // Verify filters were called
        expect(mockMethods.mockIlike).toHaveBeenCalledWith('make', '%BMW%')
        expect(mockMethods.mockGte).toHaveBeenCalledWith('rental_prices->daily', '500')
      })
  })

  describe('GET /api/cars/[id]', () => {
    it('returns car details when found', async () => {
      const mockVehicle = {
        id: 'v1',
        make: 'Audi',
        model: 'Q8',
        model_year: 2023,
        body_style: 'SUV',
        seating_capacity: 5,
        exterior_color: 'Black',
        rental_prices: { daily: 1000 },
        engine_displacement_l: 3.0,
        power_hp: 340
      }
      
      mockMethods.mockSingle.mockResolvedValue({ data: mockVehicle, error: null })

      const request = new Request('http://localhost/api/cars/v1')
      const response = await getCarDetails(request, { params: Promise.resolve({ id: 'v1' }) })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data).toMatchObject({
        id: 'v1',
        car: 'Audi',
        specifications: {
            hpw: 340
        }
      })
    })

    it('returns 404 when not found', async () => {
      mockMethods.mockSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })

      const request = new Request('http://localhost/api/cars/unknown')
      const response = await getCarDetails(request, { params: Promise.resolve({ id: 'unknown' }) })
      
      expect(response.status).toBe(404)
    })
  })

  describe('GET /api/cars/available', () => {
    it('filters occupied cars', async () => {
        // Mock bookings return
        const mockBookings = [{ vehicle_id: 'occupied1' }]
        mockMethods.mockGte.mockResolvedValueOnce({ data: mockBookings, error: null }) // for bookings query
        
        // Mock vehicles return
        const mockVehicles = [
            { id: 'v1', make: 'Audi', status: 'available' },
            { id: 'v2', make: 'BMW', status: 'available' }
        ]
        mockMethods.mockNot.mockResolvedValueOnce({ data: mockVehicles, error: null })

        const request = new Request('http://localhost/api/cars/available?date_from=2024-01-01&date_to=2024-01-05')
        const response = await getAvailableCars(request)
        const json = await response.json()

        expect(response.status).toBe(200)
        expect(json.data).toHaveLength(2)
        
        // Verify .not() was called with occupied ID
        expect(mockMethods.mockNot).toHaveBeenCalledWith('id', 'in', '(occupied1)')
    })
  })
})
