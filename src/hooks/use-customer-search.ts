/**
 * useCustomerSearch — TanStack Query hook for customer search with debounce
 *
 * Used in BookingWizard Step 1 for customer Combobox.
 * Searches customers by full_name, phone, or email.
 *
 * Features:
 * - 300ms debounce (avoids excessive API calls while typing)
 * - Minimum 2 characters before fetching
 * - Returns up to 20 results ordered by full_name
 * - RLS-aware: results filtered by Supabase RLS policies (staff sees only accessible customers)
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useDebounce } from '@/hooks/use-debounce'
import type { CustomerRecord } from '@/types'

// Minimal customer shape returned by search
export type CustomerSearchResult = Pick<
  CustomerRecord,
  'id' | 'full_name' | 'email' | 'phone' | 'address' | 'city' | 'state' | 'zip_code'
>

async function searchCustomers(query: string): Promise<CustomerSearchResult[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('id, full_name, email, phone, address, city, state, zip_code')
    .or(`full_name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`)
    .is('deleted_at', null)
    .order('full_name')
    .limit(20)

  if (error) throw error
  return (data ?? []) as CustomerSearchResult[]
}

export interface UseCustomerSearchReturn {
  customers: CustomerSearchResult[]
  isLoading: boolean
  search: string
  setSearch: (value: string) => void
}

export function useCustomerSearch(): UseCustomerSearchReturn {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)

  const { data: customers = [], isFetching } = useQuery({
    queryKey: ['customer-search', debouncedSearch],
    queryFn: () => searchCustomers(debouncedSearch),
    enabled: debouncedSearch.length >= 2,
    staleTime: 30 * 1000, // 30 seconds — results stable during wizard session
  })

  return {
    customers,
    isLoading: isFetching,
    search,
    setSearch,
  }
}
