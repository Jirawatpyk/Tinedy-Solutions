import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  calculatePackagePrice,
  getRequiredStaff,
  calculatePricing,
  getPricingTierForArea,
  getPackageTiers,
  getPackageWithTiers,
  getActivePackagesV2,
  getPackagesOverview,
  validateArea,
  getAvailableFrequencies,
  getPriceForFrequency,
  formatPrice,
  formatArea,
  formatStaffCount
} from '../pricing-utils'
import { supabase } from '@/lib/supabase'
import type { PackagePricingTier, ServicePackageV2 } from '@/types/service-package-v2'

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
  },
}))

describe('pricing-utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createMockTier = (overrides = {}): PackagePricingTier => ({
    id: 'tier-1',
    package_id: 'package-1',
    area_min: 0,
    area_max: 100,
    price_1_time: 1950,
    price_2_times: 3700,
    price_4_times: 7400,
    price_8_times: 14000,
    required_staff: 2,
    estimated_hours: 2,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  })

  const createMockPackage = (overrides = {}): ServicePackageV2 => ({
    id: 'package-1',
    name: 'Deep Cleaning Office',
    description: 'Professional office cleaning',
    service_type: 'cleaning' as const,
    category: null,
    pricing_model: 'tiered' as const,
    duration_minutes: 120,
    base_price: null,
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  })

  // ============================================================================
  // PRICE CALCULATION
  // ============================================================================

  describe('calculatePackagePrice', () => {
    it('should calculate package price successfully', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: 7400,
        error: null,
      } as any)

      const result = await calculatePackagePrice('package-1', 150, 4)

      expect(supabase.rpc).toHaveBeenCalledWith('get_package_price', {
        p_package_id: 'package-1',
        p_area_sqm: 150,
        p_frequency: 4
      })
      expect(result).toBe(7400)
    })

    it('should return 0 when data is null', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: null,
      } as any)

      const result = await calculatePackagePrice('package-1', 999, 1)

      expect(result).toBe(0)
    })

    it('should handle database error and throw', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Function not found' },
      } as any)

      const result = await calculatePackagePrice('package-1', 150, 4)

      expect(result).toBe(0)
    })

    it('should catch unexpected errors and return 0', async () => {
      vi.mocked(supabase.rpc).mockRejectedValue(new Error('Network error'))

      const result = await calculatePackagePrice('package-1', 150, 4)

      expect(result).toBe(0)
    })
  })

  describe('getRequiredStaff', () => {
    it('should get required staff count successfully', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: 5,
        error: null,
      } as any)

      const result = await getRequiredStaff('package-1', 250)

      expect(supabase.rpc).toHaveBeenCalledWith('get_required_staff', {
        p_package_id: 'package-1',
        p_area_sqm: 250
      })
      expect(result).toBe(5)
    })

    it('should return 1 when data is null', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: null,
      } as any)

      const result = await getRequiredStaff('package-1', 999)

      expect(result).toBe(1)
    })

    it('should handle database error and return 1', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Function not found' },
      } as any)

      const result = await getRequiredStaff('package-1', 250)

      expect(result).toBe(1)
    })

    it('should catch unexpected errors and return 1', async () => {
      vi.mocked(supabase.rpc).mockRejectedValue(new Error('Network error'))

      const result = await getRequiredStaff('package-1', 250)

      expect(result).toBe(1)
    })
  })

  describe('calculatePricing', () => {
    it('should calculate complete pricing with tier found', async () => {
      const mockTier = createMockTier({
        area_min: 101,
        area_max: 200,
        required_staff: 4,
        estimated_hours: 3
      })

      // Mock calculatePackagePrice
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: 14900,
        error: null,
      } as any)

      // Mock getPricingTierForArea
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockTier, error: null }),
      }
      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await calculatePricing('package-1', 150, 4)

      expect(result).toEqual({
        price: 14900,
        required_staff: 4,
        estimated_hours: 3,
        tier: mockTier,
        found: true
      })
    })

    it('should return not found result when tier is null', async () => {
      // Mock calculatePackagePrice
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: 0,
        error: null,
      } as any)

      // Mock getPricingTierForArea returning null
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        gte: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      }
      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await calculatePricing('package-1', 999, 1)

      expect(result).toEqual({
        price: 0,
        required_staff: 1,
        estimated_hours: null,
        tier: null,
        found: false
      })
    })

    it('should handle errors and return default result', async () => {
      vi.mocked(supabase.rpc).mockRejectedValue(new Error('Database error'))
      vi.mocked(supabase.from).mockImplementation(() => {
        throw new Error('Query error')
      })

      const result = await calculatePricing('package-1', 150, 4)

      expect(result).toEqual({
        price: 0,
        required_staff: 1,
        estimated_hours: null,
        tier: null,
        found: false
      })
    })
  })

  // ============================================================================
  // TIER MANAGEMENT
  // ============================================================================

  describe('getPricingTierForArea', () => {
    it('should get pricing tier for matching area', async () => {
      const mockTier = createMockTier({
        area_min: 101,
        area_max: 200
      })

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockTier, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await getPricingTierForArea('package-1', 150)

      expect(supabase.from).toHaveBeenCalledWith('package_pricing_tiers')
      expect(mockChain.select).toHaveBeenCalledWith('*')
      expect(mockChain.eq).toHaveBeenCalledWith('package_id', 'package-1')
      expect(mockChain.lte).toHaveBeenCalledWith('area_min', 150)
      expect(mockChain.gte).toHaveBeenCalledWith('area_max', 150)
      expect(result).toEqual(mockTier)
    })

    it('should return null when no tier found (PGRST116)', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await getPricingTierForArea('package-1', 999)

      expect(result).toBeNull()
    })

    it('should throw error for other database errors', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error', code: 'OTHER' }
        }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await getPricingTierForArea('package-1', 150)

      expect(result).toBeNull()
    })

    it('should catch unexpected errors and return null', async () => {
      vi.mocked(supabase.from).mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      const result = await getPricingTierForArea('package-1', 150)

      expect(result).toBeNull()
    })
  })

  describe('getPackageTiers', () => {
    it('should get all tiers for package ordered by area_min', async () => {
      const mockTiers = [
        createMockTier({ id: 'tier-1', area_min: 0, area_max: 100 }),
        createMockTier({ id: 'tier-2', area_min: 101, area_max: 200 }),
        createMockTier({ id: 'tier-3', area_min: 201, area_max: 300 }),
      ]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTiers, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await getPackageTiers('package-1')

      expect(supabase.from).toHaveBeenCalledWith('package_pricing_tiers')
      expect(mockChain.select).toHaveBeenCalledWith('*')
      expect(mockChain.eq).toHaveBeenCalledWith('package_id', 'package-1')
      expect(mockChain.order).toHaveBeenCalledWith('area_min', { ascending: true })
      expect(result).toEqual(mockTiers)
    })

    it('should return empty array when data is null', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await getPackageTiers('package-1')

      expect(result).toEqual([])
    })

    it('should handle database error and return empty array', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await getPackageTiers('package-1')

      expect(result).toEqual([])
    })

    it('should catch unexpected errors and return empty array', async () => {
      vi.mocked(supabase.from).mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      const result = await getPackageTiers('package-1')

      expect(result).toEqual([])
    })
  })

  describe('getPackageWithTiers', () => {
    it('should get package with tiers and calculate min/max prices', async () => {
      const mockPackage = createMockPackage()
      const mockTiers = [
        createMockTier({ id: 'tier-1', price_1_time: 1950, price_8_times: 14000 }),
        createMockTier({ id: 'tier-2', price_1_time: 3900, price_8_times: 28000 }),
      ]

      // Mock package query
      const mockPkgChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockPackage, error: null }),
      }

      // Mock tiers query
      const mockTiersChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTiers, error: null }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockPkgChain as any)
        .mockReturnValueOnce(mockTiersChain as any)

      const result = await getPackageWithTiers('package-1')

      expect(result).toEqual({
        ...mockPackage,
        tiers: mockTiers,
        tier_count: 2,
        min_price: 1950,
        max_price: 28000
      })
    })

    it('should return null when package not found', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await getPackageWithTiers('invalid-id')

      expect(result).toBeNull()
    })

    it('should handle package query error', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Package not found' }
        }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await getPackageWithTiers('package-1')

      expect(result).toBeNull()
    })

    it('should handle package with no tiers', async () => {
      const mockPackage = createMockPackage()

      const mockPkgChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockPackage, error: null }),
      }

      const mockTiersChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockPkgChain as any)
        .mockReturnValueOnce(mockTiersChain as any)

      const result = await getPackageWithTiers('package-1')

      expect(result).toEqual({
        ...mockPackage,
        tiers: [],
        tier_count: 0,
        min_price: undefined,
        max_price: undefined
      })
    })

    it('should catch unexpected errors and return null', async () => {
      vi.mocked(supabase.from).mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      const result = await getPackageWithTiers('package-1')

      expect(result).toBeNull()
    })
  })

  // ============================================================================
  // PACKAGE QUERIES
  // ============================================================================

  describe('getActivePackagesV2', () => {
    it('should get all active packages without service type filter', async () => {
      const mockPackages = [
        createMockPackage({ id: 'pkg-1', service_type: 'cleaning' }),
        createMockPackage({ id: 'pkg-2', service_type: 'training' }),
      ]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockPackages, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await getActivePackagesV2()

      expect(supabase.from).toHaveBeenCalledWith('service_packages_v2')
      expect(mockChain.eq).toHaveBeenCalledWith('is_active', true)
      expect(mockChain.order).toHaveBeenCalledWith('display_order', { ascending: true })
      expect(result).toEqual(mockPackages)
    })

    it('should filter by service type when provided', async () => {
      const mockPackages = [
        createMockPackage({ id: 'pkg-1', service_type: 'cleaning' }),
      ]

      // Create awaitable query object that also has .eq() method
      const mockQuery = {
        then: vi.fn((resolve) => resolve({ data: mockPackages, error: null })),
        eq: vi.fn().mockReturnThis(),
      }

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnValue(mockQuery),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await getActivePackagesV2('cleaning')

      expect(mockChain.eq).toHaveBeenCalledWith('is_active', true)
      expect(mockQuery.eq).toHaveBeenCalledWith('service_type', 'cleaning')
      expect(result).toEqual(mockPackages)
    })

    it('should return empty array when data is null', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await getActivePackagesV2()

      expect(result).toEqual([])
    })

    it('should handle database error and return empty array', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await getActivePackagesV2()

      expect(result).toEqual([])
    })

    it('should catch unexpected errors and return empty array', async () => {
      vi.mocked(supabase.from).mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      const result = await getActivePackagesV2()

      expect(result).toEqual([])
    })
  })

  describe('getPackagesOverview', () => {
    it('should get packages overview without filter', async () => {
      const mockOverview = [
        { ...createMockPackage(), tier_count: 3, min_price: 1950, max_price: 35000 },
        { ...createMockPackage({ id: 'pkg-2' }), tier_count: 2, min_price: 2500, max_price: 18000 },
      ]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockOverview, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await getPackagesOverview()

      expect(supabase.from).toHaveBeenCalledWith('service_packages_overview')
      expect(mockChain.order).toHaveBeenCalledWith('display_order', { ascending: true })
      expect(result).toEqual(mockOverview)
    })

    it('should filter by service type when provided', async () => {
      const mockOverview = [
        { ...createMockPackage({ service_type: 'training' }), tier_count: 2, min_price: 5000, max_price: 20000 },
      ]

      // Create awaitable query object that also has .eq() method
      const mockQuery = {
        then: vi.fn((resolve) => resolve({ data: mockOverview, error: null })),
        eq: vi.fn().mockReturnThis(),
      }

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnValue(mockQuery),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await getPackagesOverview('training')

      expect(mockQuery.eq).toHaveBeenCalledWith('service_type', 'training')
      expect(result).toEqual(mockOverview)
    })

    it('should return empty array when data is null', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await getPackagesOverview()

      expect(result).toEqual([])
    })

    it('should handle database error and return empty array', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await getPackagesOverview()

      expect(result).toEqual([])
    })

    it('should catch unexpected errors and return empty array', async () => {
      vi.mocked(supabase.from).mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      const result = await getPackagesOverview()

      expect(result).toEqual([])
    })
  })

  // ============================================================================
  // VALIDATION
  // ============================================================================

  describe('validateArea', () => {
    it('should return true when tier exists for area', async () => {
      const mockTier = createMockTier()

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockTier, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await validateArea('package-1', 50)

      expect(result).toBe(true)
    })

    it('should return false when no tier exists for area', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await validateArea('package-1', 999)

      expect(result).toBe(false)
    })
  })

  describe('getAvailableFrequencies', () => {
    it('should return all frequencies when all prices are defined', () => {
      const tier = createMockTier({
        price_1_time: 1950,
        price_2_times: 3700,
        price_4_times: 7400,
        price_8_times: 14000,
      })

      const result = getAvailableFrequencies(tier)

      expect(result).toEqual([1, 2, 4, 8])
    })

    it('should return only frequencies with defined prices', () => {
      const tier = createMockTier({
        price_1_time: 1950,
        price_2_times: null,
        price_4_times: 7400,
        price_8_times: null,
      })

      const result = getAvailableFrequencies(tier)

      expect(result).toEqual([1, 4])
    })

    it('should return only 1-time frequency when others are null', () => {
      const tier = createMockTier({
        price_1_time: 1950,
        price_2_times: null,
        price_4_times: null,
        price_8_times: null,
      })

      const result = getAvailableFrequencies(tier)

      expect(result).toEqual([1])
    })
  })

  describe('getPriceForFrequency', () => {
    const tier = createMockTier({
      price_1_time: 1950,
      price_2_times: 3700,
      price_4_times: 7400,
      price_8_times: 14000,
    })

    it('should return price for frequency 1', () => {
      expect(getPriceForFrequency(tier, 1)).toBe(1950)
    })

    it('should return price for frequency 2', () => {
      expect(getPriceForFrequency(tier, 2)).toBe(3700)
    })

    it('should return price for frequency 4', () => {
      expect(getPriceForFrequency(tier, 4)).toBe(7400)
    })

    it('should return price for frequency 8', () => {
      expect(getPriceForFrequency(tier, 8)).toBe(14000)
    })

    it('should return null for invalid frequency', () => {
      expect(getPriceForFrequency(tier, 99 as any)).toBeNull()
    })

    it('should return null when price is not defined', () => {
      const tierWithNulls = createMockTier({
        price_1_time: 1950,
        price_2_times: null,
        price_4_times: null,
        price_8_times: null,
      })

      expect(getPriceForFrequency(tierWithNulls, 2)).toBeNull()
      expect(getPriceForFrequency(tierWithNulls, 4)).toBeNull()
      expect(getPriceForFrequency(tierWithNulls, 8)).toBeNull()
    })
  })

  // ============================================================================
  // FORMATTING
  // ============================================================================

  describe('formatPrice', () => {
    it('should format positive price with Thai locale', () => {
      expect(formatPrice(14900)).toBe('14,900 ฿')
    })

    it('should format price with thousands separator', () => {
      expect(formatPrice(1950)).toBe('1,950 ฿')
    })

    it('should format large price correctly', () => {
      expect(formatPrice(123456)).toBe('123,456 ฿')
    })

    it('should return "-" for null', () => {
      expect(formatPrice(null)).toBe('-')
    })

    it('should return "-" for undefined', () => {
      expect(formatPrice(undefined)).toBe('-')
    })

    it('should format zero price', () => {
      expect(formatPrice(0)).toBe('0 ฿')
    })
  })

  describe('formatArea', () => {
    it('should format area with sqm unit', () => {
      expect(formatArea(150)).toBe('150 sqm')
    })

    it('should format small area', () => {
      expect(formatArea(50)).toBe('50 sqm')
    })

    it('should format large area', () => {
      expect(formatArea(500)).toBe('500 sqm')
    })

    it('should format zero area', () => {
      expect(formatArea(0)).toBe('0 sqm')
    })
  })

  describe('formatStaffCount', () => {
    it('should format staff count with Thai unit', () => {
      expect(formatStaffCount(4)).toBe('4 คน')
    })

    it('should format single staff', () => {
      expect(formatStaffCount(1)).toBe('1 คน')
    })

    it('should format large staff count', () => {
      expect(formatStaffCount(10)).toBe('10 คน')
    })

    it('should format zero staff', () => {
      expect(formatStaffCount(0)).toBe('0 คน')
    })
  })
})
