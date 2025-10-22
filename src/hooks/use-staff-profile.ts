import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth-context'
import { getErrorMessage } from '@/lib/error-utils'

export interface StaffProfile {
  id: string
  full_name: string
  email: string
  phone: string | null
  avatar_url: string | null
  role: string
  created_at: string
}

export interface PerformanceStats {
  totalJobs: number
  completedJobs: number
  completionRate: number
  averageRating: number
  totalRevenue: number
  monthlyData: {
    month: string
    jobs: number
    revenue: number
  }[]
}

export function useStaffProfile() {
  const { user, profile } = useAuth()
  const [staffProfile, setStaffProfile] = useState<StaffProfile | null>(null)
  const [performanceStats, setPerformanceStats] = useState<PerformanceStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadProfile = useCallback(async () => {
    if (!profile) return

    try {
      setStaffProfile({
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        phone: profile.phone,
        avatar_url: profile.avatar_url,
        role: profile.role,
        created_at: profile.created_at,
      })
    } catch (err) {
      console.error('Error loading profile:', err)
      setError(getErrorMessage(err))
    }
  }, [profile])

  const loadPerformanceStats = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      // Get last 6 months of data
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      const sixMonthsAgoStr = sixMonthsAgo.toISOString().split('T')[0]

      // Total jobs
      const { count: totalJobs } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('staff_id', user.id)
        .gte('booking_date', sixMonthsAgoStr)

      // Completed jobs
      const { count: completedJobs } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('staff_id', user.id)
        .eq('status', 'completed')
        .gte('booking_date', sixMonthsAgoStr)

      const completionRate = totalJobs ? ((completedJobs || 0) / totalJobs) * 100 : 0

      // Average rating
      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('staff_id', user.id)

      const averageRating =
        reviews && reviews.length > 0
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
          : 0

      // Total revenue (from completed bookings)
      const { data: revenueData } = await supabase
        .from('bookings')
        .select(`
          service_packages (price)
        `)
        .eq('staff_id', user.id)
        .eq('status', 'completed')
        .gte('booking_date', sixMonthsAgoStr)

      interface RevenueBooking {
        service_packages: { price: number }[] | { price: number } | null
      }

      const totalRevenue = (revenueData as RevenueBooking[] | null)?.reduce((sum, booking) => {
        const servicePackage = Array.isArray(booking.service_packages)
          ? booking.service_packages[0]
          : booking.service_packages
        return sum + (servicePackage?.price || 0)
      }, 0) || 0

      // Monthly breakdown
      const { data: monthlyBookings } = await supabase
        .from('bookings')
        .select(`
          booking_date,
          status,
          service_packages (price)
        `)
        .eq('staff_id', user.id)
        .gte('booking_date', sixMonthsAgoStr)
        .order('booking_date', { ascending: true })

      interface MonthlyBooking {
        booking_date: string
        status: string
        service_packages: { price: number }[] | { price: number } | null
      }

      // Group by month
      const monthlyMap = new Map<string, { jobs: number; revenue: number }>()
      ;(monthlyBookings as MonthlyBooking[] | null)?.forEach((booking) => {
        const month = new Date(booking.booking_date).toISOString().slice(0, 7) // YYYY-MM
        if (!monthlyMap.has(month)) {
          monthlyMap.set(month, { jobs: 0, revenue: 0 })
        }
        const data = monthlyMap.get(month)!
        data.jobs += 1
        if (booking.status === 'completed') {
          const servicePackage = Array.isArray(booking.service_packages)
            ? booking.service_packages[0]
            : booking.service_packages
          data.revenue += servicePackage?.price || 0
        }
      })

      const monthlyData = Array.from(monthlyMap.entries())
        .map(([month, data]) => ({
          month,
          jobs: data.jobs,
          revenue: data.revenue,
        }))
        .sort((a, b) => a.month.localeCompare(b.month))

      setPerformanceStats({
        totalJobs: totalJobs || 0,
        completedJobs: completedJobs || 0,
        completionRate: Math.round(completionRate),
        averageRating: Math.round(averageRating * 10) / 10,
        totalRevenue,
        monthlyData,
      })
    } catch (err) {
      console.error('Error loading performance stats:', err)
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!user || !profile) return
    loadProfile()
    loadPerformanceStats()
  }, [user, profile, loadProfile, loadPerformanceStats])

  async function updateProfile(updates: {
    full_name?: string
    phone?: string
  }) {
    if (!user) return

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)

      if (error) throw error

      // Reload profile
      await loadProfile()
    } catch (err) {
      console.error('Error updating profile:', err)
      throw err
    }
  }

  async function uploadAvatar(file: File) {
    if (!user) return

    try {
      // Validate file
      const maxSize = 2 * 1024 * 1024 // 2MB
      if (file.size > maxSize) {
        throw new Error('ไฟล์ใหญ่เกินไป (สูงสุด 2MB)')
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        throw new Error('รองรับเฉพาะไฟล์ JPG, PNG, WEBP')
      }

      // Delete old avatar if exists
      if (staffProfile?.avatar_url) {
        const oldPath = staffProfile.avatar_url.split('/').pop()
        if (oldPath) {
          await supabase.storage.from('avatars').remove([`${user.id}/${oldPath}`])
        }
      }

      // Upload new avatar
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('id', user.id)

      if (updateError) throw updateError

      // Reload profile
      await loadProfile()

      return data.publicUrl
    } catch (err) {
      console.error('Error uploading avatar:', err)
      throw err
    }
  }

  async function changePassword(newPassword: string) {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error
    } catch (err) {
      console.error('Error changing password:', err)
      throw err
    }
  }

  return {
    staffProfile,
    performanceStats,
    loading,
    error,
    updateProfile,
    uploadAvatar,
    changePassword,
    refresh: () => {
      loadProfile()
      loadPerformanceStats()
    },
  }
}
