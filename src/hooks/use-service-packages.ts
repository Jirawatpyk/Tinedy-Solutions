import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { ServicePackage } from '@/types'

export function useServicePackages() {
  const [servicePackages, setServicePackages] = useState<ServicePackage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchServicePackages() {
      try {
        const { data, error } = await supabase
          .from('service_packages')
          .select('id, name, description, service_type, duration_minutes, price, is_active, created_at')
          .eq('is_active', true)
          .order('name')

        if (error) throw error
        setServicePackages(data || [])
      } catch (error) {
        console.error('Error fetching service packages:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchServicePackages()
  }, [])

  return { servicePackages, loading }
}
