/**
 * usePackageDetail Hook
 *
 * Extracted from package-detail.tsx to reduce god component complexity.
 * Manages data fetching, state (via useReducer), and CRUD actions for package detail page.
 */

import { useReducer, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/auth-context'
import { mapErrorToUserMessage } from '@/lib/error-messages'
import { logger } from '@/lib/logger'
import type { ServicePackageV2WithTiers, PackagePricingTier } from '@/types'
import { PricingModel } from '@/types'

// --- Types ---

export interface PackageStats {
  total_bookings: number
  completed_bookings: number
  pending_bookings: number
  cancelled_bookings: number
  total_revenue: number
  last_booking_date: string | null
}

export interface BookingWithRelations {
  id: string
  booking_date: string
  start_time: string
  end_time: string
  status: string
  total_price: number
  payment_status?: string
  customers: {
    id: string
    full_name: string
    phone: string
  } | null
  profiles: {
    full_name: string
  } | null
  teams: {
    name: string
  } | null
}

// --- Reducer ---

interface PackageDetailState {
  packageData: ServicePackageV2WithTiers | null
  packageSource: 'v1' | 'v2'
  stats: PackageStats
  bookings: BookingWithRelations[]
  loading: boolean
  error: string | null
  isEditDialogOpen: boolean
  toggling: boolean
  bookingsPage: number
  statusFilter: string
}

type PackageDetailAction =
  | { type: 'SET_PACKAGE'; payload: { data: ServicePackageV2WithTiers; source: 'v1' | 'v2' } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_STATS'; payload: PackageStats }
  | { type: 'SET_BOOKINGS'; payload: BookingWithRelations[] }
  | { type: 'OPEN_EDIT_MODAL' }
  | { type: 'CLOSE_MODAL' }
  | { type: 'SET_TOGGLING'; payload: boolean }
  | { type: 'TOGGLE_ACTIVE' }
  | { type: 'SET_PAGE'; payload: number }
  | { type: 'SET_STATUS_FILTER'; payload: string }

const initialStats: PackageStats = {
  total_bookings: 0,
  completed_bookings: 0,
  pending_bookings: 0,
  cancelled_bookings: 0,
  total_revenue: 0,
  last_booking_date: null,
}

function packageDetailReducer(state: PackageDetailState, action: PackageDetailAction): PackageDetailState {
  switch (action.type) {
    case 'SET_PACKAGE':
      return { ...state, packageData: action.payload.data, packageSource: action.payload.source }
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    case 'SET_STATS':
      return { ...state, stats: action.payload }
    case 'SET_BOOKINGS':
      return { ...state, bookings: action.payload }
    case 'OPEN_EDIT_MODAL':
      return { ...state, isEditDialogOpen: true }
    case 'CLOSE_MODAL':
      return { ...state, isEditDialogOpen: false }
    case 'SET_TOGGLING':
      return { ...state, toggling: action.payload }
    case 'TOGGLE_ACTIVE':
      if (!state.packageData) return state
      return { ...state, packageData: { ...state.packageData, is_active: !state.packageData.is_active } }
    case 'SET_PAGE':
      return { ...state, bookingsPage: action.payload }
    case 'SET_STATUS_FILTER':
      return { ...state, statusFilter: action.payload, bookingsPage: 1 }
    default:
      return state
  }
}

// --- Hook ---

export function usePackageDetail(packageId: string | undefined) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const isMountedRef = useRef(true)

  const basePath = '/admin'

  const [state, dispatch] = useReducer(packageDetailReducer, {
    packageData: null,
    packageSource: 'v2',
    stats: initialStats,
    bookings: [],
    loading: true,
    error: null,
    isEditDialogOpen: false,
    toggling: false,
    bookingsPage: 1,
    statusFilter: 'all',
  })

  // --- Data Fetching ---

  const fetchPackageStats = useCallback(async (pkgId: string) => {
    try {
      const { data: bookingsData, error } = await supabase
        .from('bookings')
        .select('status, total_price, booking_date')
        .or(`service_package_id.eq.${pkgId},package_v2_id.eq.${pkgId}`)

      if (error) throw error
      if (!bookingsData) return

      const completed = bookingsData.filter(b => b.status === 'completed').length
      const pending = bookingsData.filter(b => b.status === 'pending').length
      const cancelled = bookingsData.filter(b => b.status === 'cancelled').length
      const revenue = bookingsData
        .filter(b => b.status === 'completed')
        .reduce((sum, b) => sum + Number(b.total_price), 0)
      const dates = bookingsData.map(b => new Date(b.booking_date))
      const lastDate = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : null

      dispatch({
        type: 'SET_STATS',
        payload: {
          total_bookings: bookingsData.length,
          completed_bookings: completed,
          pending_bookings: pending,
          cancelled_bookings: cancelled,
          total_revenue: revenue,
          last_booking_date: lastDate ? lastDate.toISOString() : null,
        },
      })
    } catch (err) {
      logger.error('Error fetching package stats', { error: err }, { context: 'PackageDetail' })
      toast({ title: 'Warning', description: 'Could not load package statistics', variant: 'destructive' })
    }
  }, [toast])

  const fetchPackageBookings = useCallback(async (pkgId: string) => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id, booking_date, start_time, end_time, status, total_price,
          customers (id, full_name, phone),
          profiles!bookings_staff_id_fkey (full_name),
          teams (name)
        `)
        .or(`service_package_id.eq.${pkgId},package_v2_id.eq.${pkgId}`)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      dispatch({ type: 'SET_BOOKINGS', payload: (data as unknown as BookingWithRelations[]) || [] })
    } catch (err) {
      logger.error('Error fetching package bookings', { error: err }, { context: 'PackageDetail' })
      toast({ title: 'Warning', description: 'Could not load bookings history', variant: 'destructive' })
    }
  }, [toast])

  const fetchPackageDetails = useCallback(async () => {
    if (!packageId) return

    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      dispatch({ type: 'SET_ERROR', payload: null })

      const { data: v2Package, error: v2Error } = await supabase
        .from('service_packages_v2')
        .select(`*, tiers:package_pricing_tiers(*)`)
        .eq('id', packageId)
        .maybeSingle()

      if (v2Error) throw v2Error

      let pkgData: ServicePackageV2WithTiers | null = null
      let source: 'v1' | 'v2' = 'v2'

      if (v2Package) {
        const tiers = v2Package.tiers || []
        pkgData = {
          ...v2Package,
          tiers,
          tier_count: tiers.length,
          min_price: tiers.length > 0 ? Math.min(...tiers.map((t: PackagePricingTier) => t.price_1_time)) : v2Package.base_price,
          max_price: tiers.length > 0 ? Math.max(...tiers.map((t: PackagePricingTier) => t.price_1_time)) : v2Package.base_price,
        }
        source = 'v2'
      } else {
        const { data: v1Package, error: v1Error } = await supabase
          .from('service_packages')
          .select('*')
          .eq('id', packageId)
          .single()

        if (v1Error) throw v1Error

        pkgData = {
          id: v1Package.id,
          name: v1Package.name,
          description: v1Package.description,
          service_type: v1Package.service_type,
          category: null,
          pricing_model: PricingModel.Fixed,
          duration_minutes: v1Package.duration_minutes,
          base_price: Number(v1Package.price),
          is_active: v1Package.is_active,
          created_at: v1Package.created_at,
          updated_at: v1Package.created_at,
          tiers: [],
          tier_count: 0,
          min_price: Number(v1Package.price),
          max_price: Number(v1Package.price),
        }
        source = 'v1'
      }

      if (!isMountedRef.current) return

      dispatch({ type: 'SET_PACKAGE', payload: { data: pkgData!, source } })
      await Promise.all([fetchPackageStats(packageId), fetchPackageBookings(packageId)])
    } catch (err) {
      logger.error('Error fetching package details', { error: err }, { context: 'PackageDetail' })
      if (!isMountedRef.current) return
      const errorMsg = mapErrorToUserMessage(err, 'general')
      dispatch({ type: 'SET_ERROR', payload: errorMsg.description })
    } finally {
      if (isMountedRef.current) {
        dispatch({ type: 'SET_LOADING', payload: false })
      }
    }
  }, [packageId, fetchPackageStats, fetchPackageBookings])

  useEffect(() => {
    isMountedRef.current = true
    if (packageId) fetchPackageDetails()
    return () => { isMountedRef.current = false }
  }, [packageId, fetchPackageDetails])

  // --- Actions ---

  const invalidatePackageCache = useCallback(() => {
    queryClient.removeQueries({
      predicate: (query) =>
        Array.isArray(query.queryKey) && query.queryKey[0] === 'packages',
    })
  }, [queryClient])

  const handleToggleActive = useCallback(async () => {
    if (!state.packageData || state.toggling) return

    try {
      dispatch({ type: 'SET_TOGGLING', payload: true })
      const tableName = state.packageSource === 'v1' ? 'service_packages' : 'service_packages_v2'
      const { error } = await supabase
        .from(tableName)
        .update({ is_active: !state.packageData.is_active })
        .eq('id', state.packageData.id)

      if (error) throw error

      dispatch({ type: 'TOGGLE_ACTIVE' })
      invalidatePackageCache()
      toast({
        title: 'Success',
        description: `Package ${state.packageData.is_active ? 'deactivated' : 'activated'} successfully`,
      })
    } catch (err) {
      const errorMsg = mapErrorToUserMessage(err, 'general')
      toast({ title: errorMsg.title, description: errorMsg.description, variant: 'destructive' })
    } finally {
      dispatch({ type: 'SET_TOGGLING', payload: false })
    }
  }, [state.packageData, state.packageSource, state.toggling, toast, invalidatePackageCache])

  const handleDelete = useCallback(async () => {
    if (!state.packageData) return

    if (state.stats.total_bookings > 0) {
      toast({
        title: 'Cannot Delete',
        description: `This package has ${state.stats.total_bookings} booking(s). Cannot delete packages with existing bookings.`,
        variant: 'destructive',
      })
      return
    }

    try {
      if (state.packageSource === 'v2' && state.packageData.pricing_model === PricingModel.Tiered && state.packageData.tiers && state.packageData.tiers.length > 0) {
        const { error: tiersError } = await supabase
          .from('package_pricing_tiers')
          .delete()
          .eq('package_id', state.packageData.id)
        if (tiersError) throw tiersError
      }

      const tableName = state.packageSource === 'v1' ? 'service_packages' : 'service_packages_v2'
      const { error } = await supabase.from(tableName).delete().eq('id', state.packageData.id)
      if (error) throw error

      queryClient.removeQueries({ queryKey: queryKeys.packages.all })
      toast({ title: 'Success', description: 'Package deleted successfully' })
      navigate(`${basePath}/packages`)
    } catch (err) {
      const errorMsg = mapErrorToUserMessage(err, 'general')
      toast({ title: errorMsg.title, description: errorMsg.description, variant: 'destructive' })
    }
  }, [state.packageData, state.packageSource, state.stats.total_bookings, toast, navigate, queryClient, basePath])

  const handleArchive = useCallback(async () => {
    if (!state.packageData) return

    if (state.stats.total_bookings > 0) {
      toast({
        title: 'Cannot Archive',
        description: `This package has ${state.stats.total_bookings} booking(s). Cannot archive packages with existing bookings.`,
        variant: 'destructive',
      })
      return
    }

    try {
      const tableName = state.packageSource === 'v1' ? 'service_packages' : 'service_packages_v2'
      const { error } = await supabase
        .from(tableName)
        .update({ deleted_at: new Date().toISOString(), deleted_by: user?.id })
        .eq('id', state.packageData.id)

      if (error) throw error

      queryClient.removeQueries({ queryKey: queryKeys.packages.all })
      toast({ title: 'Success', description: 'Package archived successfully' })
      navigate(`${basePath}/packages`)
    } catch (err) {
      const errorMsg = mapErrorToUserMessage(err, 'general')
      toast({ title: errorMsg.title, description: errorMsg.description, variant: 'destructive' })
    }
  }, [state.packageData, state.packageSource, state.stats.total_bookings, toast, navigate, user?.id, queryClient, basePath])

  return {
    ...state,
    dispatch,
    fetchPackageDetails,
    handleToggleActive,
    handleDelete,
    handleArchive,
    basePath,
  }
}
