import { describe, it, expect, beforeEach, vi } from 'vitest'
import { supabase } from '@/lib/supabase'
import {
  fetchServicePackagesV1,
  fetchServicePackagesV2,
  fetchServicePackagesV2WithArchived,
  fetchUnifiedServicePackages,
  fetchAllServicePackagesForAdmin,
} from '../package-queries'
import type { ServicePackage } from '@/types'

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

describe('package-queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchServicePackagesV1', () => {
    it('should fetch V1 packages successfully', async () => {
      const mockPackages: ServicePackage[] = [
        {
          id: '1',
          name: 'Basic Cleaning',
          description: 'Basic cleaning service',
          service_type: 'cleaning',
          duration_minutes: 120,
          price: 1500,
          is_active: true,
          created_at: '2025-01-01T00:00:00Z',
        },
        {
          id: '2',
          name: 'Deep Cleaning',
          description: 'Deep cleaning service',
          service_type: 'cleaning',
          duration_minutes: 240,
          price: 3000,
          is_active: true,
          created_at: '2025-01-01T00:00:00Z',
        },
      ]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockPackages, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchServicePackagesV1()

      expect(result).toEqual(mockPackages)
      expect(mockChain.order).toHaveBeenCalledWith('name')
    })

    it('should return empty array when no packages', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchServicePackagesV1()

      expect(result).toEqual([])
    })

    it('should handle errors by throwing', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      await expect(fetchServicePackagesV1()).rejects.toThrow('Failed to fetch V1 packages')
    })
  })

  describe('fetchServicePackagesV2', () => {
    it('should fetch V2 packages with tiers successfully', async () => {
      const mockPackages = [
        {
          id: 'v2-1',
          name: 'Premium Cleaning',
          description: 'Premium cleaning service',
          service_type: 'cleaning',
          pricing_model: 'tiered',
          base_price: null,
          category: 'residential',
          duration_minutes: 180,
          is_active: true,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          deleted_at: null,
        },
      ]

      const mockTiers = [
        {
          id: 'tier-1',
          package_id: 'v2-1',
          area_min: 0,
          area_max: 50,
          required_staff: 1,
          estimated_hours: 2,
          price_1_time: 2000,
          price_2_times: 1800,
          price_4_times: 1600,
          price_8_times: 1400,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        },
        {
          id: 'tier-2',
          package_id: 'v2-1',
          area_min: 51,
          area_max: 100,
          required_staff: 2,
          estimated_hours: 3,
          price_1_time: 3000,
          price_2_times: 2700,
          price_4_times: 2400,
          price_8_times: 2100,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        },
      ]

      const mockPackagesChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockPackages, error: null }),
      }

      const mockTiersChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTiers, error: null }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockPackagesChain as any)
        .mockReturnValueOnce(mockTiersChain as any)

      const result = await fetchServicePackagesV2()

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: 'v2-1',
        name: 'Premium Cleaning',
        tier_count: 2,
        min_price: 1400, // min from all tier prices
        max_price: 3000, // max from all tier prices
      })
      expect(result[0].tiers).toEqual(mockTiers)
    })

    it('should calculate min/max for fixed pricing model', async () => {
      const mockPackages = [
        {
          id: 'v2-2',
          name: 'Fixed Price Package',
          description: 'Fixed pricing',
          service_type: 'training',
          pricing_model: 'fixed',
          base_price: 5000,
          category: 'corporate',
          duration_minutes: 360,
          is_active: true,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          deleted_at: null,
        },
      ]

      const mockPackagesChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockPackages, error: null }),
      }

      const mockTiersChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockPackagesChain as any)
        .mockReturnValueOnce(mockTiersChain as any)

      const result = await fetchServicePackagesV2()

      expect(result[0]).toMatchObject({
        min_price: 5000,
        max_price: 5000,
        tier_count: 0,
      })
    })

    it('should handle packages without tiers', async () => {
      const mockPackages = [
        {
          id: 'v2-3',
          name: 'No Tiers Package',
          pricing_model: 'tiered',
          base_price: null,
          is_active: true,
          service_type: 'cleaning',
          description: null,
          category: null,
          duration_minutes: 120,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          deleted_at: null,
        },
      ]

      const mockPackagesChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockPackages, error: null }),
      }

      const mockTiersChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockPackagesChain as any)
        .mockReturnValueOnce(mockTiersChain as any)

      const result = await fetchServicePackagesV2()

      expect(result[0]).toMatchObject({
        tier_count: 0,
        min_price: undefined,
        max_price: undefined,
      })
    })

    it('should exclude soft-deleted packages and return empty when none', async () => {
      const mockPackagesChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      const mockTiersChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockPackagesChain as any)
        .mockReturnValueOnce(mockTiersChain as any)

      const result = await fetchServicePackagesV2()

      expect(result).toEqual([])
      expect(mockPackagesChain.is).toHaveBeenCalledWith('deleted_at', null)
    })
  })

  describe('fetchServicePackagesV2WithArchived', () => {
    it('should call without deleted_at filter', async () => {
      // This function is similar to fetchServicePackagesV2 but doesn't filter deleted_at
      // Basic coverage test only
      const mockPackagesChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockPackagesChain as any)

      const result = await fetchServicePackagesV2WithArchived()

      expect(result).toEqual([])
    })

    it('should include soft-deleted packages', async () => {
      const mockPackages = [
        {
          id: 'v2-archived-1',
          name: 'Archived Package',
          description: 'This was deleted',
          service_type: 'cleaning',
          pricing_model: 'fixed',
          base_price: 2500,
          category: 'residential',
          duration_minutes: 180,
          is_active: false,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-10T00:00:00Z',
          deleted_at: '2025-01-15T00:00:00Z',
          deleted_by: 'admin-1',
        },
        {
          id: 'v2-active-1',
          name: 'Active Package',
          description: 'Still active',
          service_type: 'training',
          pricing_model: 'tiered',
          base_price: null,
          category: 'corporate',
          duration_minutes: 240,
          is_active: true,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          deleted_at: null,
        },
      ]

      const mockTiers = [
        {
          id: 'tier-1',
          package_id: 'v2-active-1',
          area_min: 0,
          area_max: 100,
          required_staff: 2,
          estimated_hours: 3,
          price_1_time: 3000,
          price_2_times: 5500,
          price_4_times: 10000,
          price_8_times: 18000,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        },
      ]

      const mockPackagesChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockPackages, error: null }),
      }

      const mockTiersChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTiers, error: null }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockPackagesChain as any)
        .mockReturnValueOnce(mockTiersChain as any)

      const result = await fetchServicePackagesV2WithArchived()

      // Should include both active and archived
      expect(result).toHaveLength(2)

      // Archived package
      const archived = result.find(p => p.id === 'v2-archived-1')
      expect(archived).toBeDefined()
      expect(archived?.deleted_at).toBe('2025-01-15T00:00:00Z')
      expect(archived?.min_price).toBe(2500)
      expect(archived?.max_price).toBe(2500)

      // Active package with tiers
      const active = result.find(p => p.id === 'v2-active-1')
      expect(active).toBeDefined()
      expect(active?.deleted_at).toBeNull()
      expect(active?.tier_count).toBe(1)
      expect(active?.min_price).toBe(3000)
      expect(active?.max_price).toBe(18000)
    })
  })

  describe('fetchUnifiedServicePackages', () => {
    it('should merge V1 and V2 packages filtering only active', async () => {
      const mockV1Packages = [
        {
          id: 'v1-1',
          name: 'V1 Active',
          description: 'V1 active package',
          service_type: 'cleaning',
          duration_minutes: 120,
          price: 1500,
          is_active: true,
          created_at: '2025-01-01T00:00:00Z',
        },
        {
          id: 'v1-2',
          name: 'V1 Inactive',
          description: 'V1 inactive package',
          service_type: 'training',
          duration_minutes: 240,
          price: 3000,
          is_active: false,
          created_at: '2025-01-01T00:00:00Z',
        },
      ]

      const mockV2Packages = [
        {
          id: 'v2-8',
          name: 'V2 Active',
          description: 'V2 active package',
          service_type: 'cleaning',
          pricing_model: 'fixed',
          base_price: 2000,
          category: 'residential',
          duration_minutes: 180,
          is_active: true,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          tiers: [],
          tier_count: 0,
          min_price: 2000,
          max_price: 2000,
        },
        {
          id: 'v2-9',
          name: 'V2 Inactive',
          description: 'V2 inactive package',
          service_type: 'training',
          pricing_model: 'tiered',
          base_price: null,
          category: 'corporate',
          duration_minutes: 360,
          is_active: false,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          tiers: [],
          tier_count: 0,
        },
      ]

      // Mock fetchServicePackagesV1
      const mockV1Chain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockV1Packages, error: null }),
      }

      // Mock fetchServicePackagesV2
      const mockV2PackagesChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockV2Packages, error: null }),
      }

      const mockV2TiersChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockV1Chain as any) // V1 packages
        .mockReturnValueOnce(mockV2PackagesChain as any) // V2 packages
        .mockReturnValueOnce(mockV2TiersChain as any) // V2 tiers

      const result = await fetchUnifiedServicePackages()

      // Should only include active packages: v1-1, v2-8
      expect(result).toHaveLength(2)
      expect(result.find(p => p.id === 'v1-1')).toMatchObject({
        _source: 'v1',
        pricing_model: 'fixed',
        tier_count: 0,
      })
      expect(result.find(p => p.id === 'v2-8')).toMatchObject({
        _source: 'v2',
      })
      expect(result.find(p => p.id === 'v1-2')).toBeUndefined() // inactive
      expect(result.find(p => p.id === 'v2-9')).toBeUndefined() // inactive
    })

    it('should normalize V1 packages correctly', async () => {
      const mockV1Packages = [
        {
          id: 'v1-3',
          name: 'V1 Package',
          description: 'Test V1',
          service_type: 'cleaning',
          duration_minutes: 120,
          price: 1500,
          is_active: true,
          created_at: '2025-01-01T00:00:00Z',
        },
      ]

      const mockV1Chain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockV1Packages, error: null }),
      }

      const mockV2PackagesChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockV1Chain as any)
        .mockReturnValueOnce(mockV2PackagesChain as any)

      const result = await fetchUnifiedServicePackages()

      expect(result[0]).toMatchObject({
        id: 'v1-3',
        pricing_model: 'fixed',
        base_price: 1500,
        tiers: [],
        tier_count: 0,
        min_price: 1500,
        max_price: 1500,
        updated_at: '2025-01-01T00:00:00Z', // Same as created_at for V1
        _source: 'v1',
      })
    })
  })

  describe('fetchAllServicePackagesForAdmin', () => {
    it('should merge V1 and V2 packages including inactive', async () => {
      const mockV1Packages = [
        {
          id: 'v1-4',
          name: 'V1 Active',
          description: 'V1 active',
          service_type: 'cleaning',
          duration_minutes: 120,
          price: 1500,
          is_active: true,
          created_at: '2025-01-01T00:00:00Z',
        },
        {
          id: 'v1-5',
          name: 'V1 Inactive',
          description: 'V1 inactive',
          service_type: 'training',
          duration_minutes: 240,
          price: 3000,
          is_active: false,
          created_at: '2025-01-01T00:00:00Z',
        },
      ]

      const mockV2Packages = [
        {
          id: 'v2-10',
          name: 'V2 Inactive',
          description: 'V2 inactive',
          service_type: 'cleaning',
          pricing_model: 'tiered',
          base_price: null,
          category: 'residential',
          duration_minutes: 180,
          is_active: false,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          tiers: [],
          tier_count: 0,
        },
      ]

      const mockV1Chain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockV1Packages, error: null }),
      }

      const mockV2PackagesChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockV2Packages, error: null }),
      }

      const mockV2TiersChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockV1Chain as any)
        .mockReturnValueOnce(mockV2PackagesChain as any)
        .mockReturnValueOnce(mockV2TiersChain as any)

      const result = await fetchAllServicePackagesForAdmin()

      // Should include ALL packages including inactive
      expect(result).toHaveLength(3)
      expect(result.find(p => p.id === 'v1-4')).toBeDefined()
      expect(result.find(p => p.id === 'v1-5')).toBeDefined() // inactive included
      expect(result.find(p => p.id === 'v2-10')).toBeDefined() // inactive included
    })
  })

  describe('packageQueryOptions', () => {
    it('should have v1 query options', async () => {
      const { packageQueryOptions } = await import('../package-queries')

      expect(packageQueryOptions.v1).toBeDefined()
      expect(packageQueryOptions.v1.queryKey).toBeDefined()
      expect(packageQueryOptions.v1.queryFn).toBeDefined()
    })

    it('should have v2 query options', async () => {
      const { packageQueryOptions } = await import('../package-queries')

      expect(packageQueryOptions.v2).toBeDefined()
      expect(packageQueryOptions.v2.queryKey).toBeDefined()
      expect(packageQueryOptions.v2.queryFn).toBeDefined()
    })

    it('should have v2WithArchived query options', async () => {
      const { packageQueryOptions } = await import('../package-queries')

      expect(packageQueryOptions.v2WithArchived).toBeDefined()
      expect(packageQueryOptions.v2WithArchived.queryKey).toBeDefined()
      expect(packageQueryOptions.v2WithArchived.queryFn).toBeDefined()
    })

    it('should have unified query options', async () => {
      const { packageQueryOptions } = await import('../package-queries')

      expect(packageQueryOptions.unified).toBeDefined()
      expect(packageQueryOptions.unified.queryKey).toBeDefined()
      expect(packageQueryOptions.unified.queryFn).toBeDefined()
    })

    it('should have allForAdmin query options', async () => {
      const { packageQueryOptions } = await import('../package-queries')

      expect(packageQueryOptions.allForAdmin).toBeDefined()
      expect(packageQueryOptions.allForAdmin.queryKey).toBeDefined()
      expect(packageQueryOptions.allForAdmin.queryFn).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('should throw error when fetchServicePackagesV2 packages query fails', async () => {
      const mockPackagesChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockPackagesChain as any)

      await expect(fetchServicePackagesV2()).rejects.toThrow('Failed to fetch V2 packages')
    })

    it('should handle tiers query failure gracefully (return empty tiers)', async () => {
      const mockPackagesChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'pkg-1',
              name: 'Test Package',
              pricing_model: 'tiered',
              is_active: true,
            },
          ],
          error: null,
        }),
      }

      const mockTiersChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Tier error' } }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockPackagesChain as any)
        .mockReturnValueOnce(mockTiersChain as any)

      const result = await fetchServicePackagesV2()

      // Should return packages with empty tiers array instead of throwing
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('pkg-1')
      expect(result[0].tiers).toEqual([])
      expect(result[0].tier_count).toBe(0)
    })
  })
})
