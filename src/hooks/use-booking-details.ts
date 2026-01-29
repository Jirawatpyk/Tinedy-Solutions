/**
 * useBookingDetails Hooks
 *
 * Data fetching hooks for BookingDetailsModal.
 * Extracted from booking-details-modal.tsx useEffect data fetching.
 *
 * Hooks:
 * - useBookingReview: Fetch review data for a booking
 * - useBookingTeamMembers: Fetch team members active at booking creation time
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface Review {
  id: string
  booking_id: string
  rating: number
  created_at: string
}

export interface TeamMember {
  id: string
  is_active: boolean
  staff_id: string
  full_name: string
  joined_at: string | null
  left_at: string | null
}

/**
 * Fetch review data for a booking
 */
export function useBookingReview(bookingId: string | undefined, enabled: boolean) {
  const query = useQuery({
    queryKey: ['booking-review', bookingId],
    queryFn: async (): Promise<Review | null> => {
      if (!bookingId) return null

      try {
        const { data, error } = await supabase
          .from('reviews')
          .select('id, booking_id, rating, created_at')
          .eq('booking_id', bookingId)
          .maybeSingle()

        if (error) throw error

        return data
      } catch (error) {
        console.error('[BookingDetails] Error fetching review:', error)
        return null
      }
    },
    enabled: !!bookingId && enabled,
    staleTime: 30_000,
  })

  return {
    review: query.data ?? null,
    isLoadingReview: query.isLoading,
  }
}

/**
 * Fetch team members who were active at booking creation time
 */
export function useBookingTeamMembers(
  teamId: string | null | undefined,
  createdAt: string | undefined,
  enabled: boolean
) {
  const query = useQuery({
    queryKey: ['booking-team-members', teamId, createdAt],
    queryFn: async (): Promise<TeamMember[]> => {
      if (!teamId || !createdAt) return []

      try {
        const { data, error } = await supabase
          .rpc('get_all_team_members_with_dates', { p_team_id: teamId })

        if (error) throw error

        // Filter members who were active at booking creation time
        const bookingCreatedAt = new Date(createdAt)

        const membersAtBookingTime: TeamMember[] = (data || [])
          .filter((m: { joined_at: string | null; left_at: string | null }) => {
            // Member had joined before or at booking creation
            const joinedAt = m.joined_at ? new Date(m.joined_at) : null
            if (joinedAt && joinedAt > bookingCreatedAt) {
              return false // Joined after booking was created
            }

            // Member hadn't left yet at booking creation
            // Use < (not <=) because if staff left at exactly the same time as booking creation,
            // they were still a member at that moment
            const leftAt = m.left_at ? new Date(m.left_at) : null
            if (leftAt && leftAt < bookingCreatedAt) {
              return false // Already left before booking was created
            }

            return true
          })
          .map((m: { id: string; is_active: boolean; staff_id: string; full_name: string; joined_at: string | null; left_at: string | null }) => ({
            id: m.id,
            is_active: m.is_active,
            staff_id: m.staff_id,
            full_name: m.full_name || 'Unknown',
            joined_at: m.joined_at,
            left_at: m.left_at,
          }))

        return membersAtBookingTime
      } catch (error) {
        console.error('[BookingDetails] Error fetching team members:', error)
        return []
      }
    },
    enabled: !!teamId && enabled,
    staleTime: 30_000,
  })

  return {
    teamMembers: query.data ?? [],
    isLoadingTeamMembers: query.isLoading,
  }
}
