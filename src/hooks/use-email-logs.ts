import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getErrorMessage } from '@/lib/error-utils'

export interface EmailLog {
  id: string
  booking_id: string | null
  email_type: string
  recipient_email: string
  recipient_name: string | null
  status: string
  subject: string | null
  error_message: string | null
  attempts: number
  max_attempts: number
  scheduled_at: string | null
  sent_at: string | null
  created_at: string
  updated_at: string
}

interface UseEmailLogsParams {
  status?: string
  emailType?: string
  page?: number
  pageSize?: number
}

export function useEmailLogs({
  status,
  emailType,
  page = 1,
  pageSize = 20,
}: UseEmailLogsParams = {}) {
  const [logs, setLogs] = useState<EmailLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('email_queue')
        .select(
          'id, booking_id, email_type, recipient_email, recipient_name, status, subject, error_message, attempts, max_attempts, scheduled_at, sent_at, created_at, updated_at',
          { count: 'exact' }
        )

      if (status && status !== 'all') {
        query = query.eq('status', status)
      }

      if (emailType && emailType !== 'all') {
        query = query.eq('email_type', emailType)
      }

      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      query = query
        .order('created_at', { ascending: false })
        .range(from, to)

      const { data, error: fetchError, count } = await query

      if (fetchError) throw fetchError

      setLogs(data || [])
      setTotalCount(count || 0)
    } catch (err) {
      console.error('Error fetching email logs:', err)
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [status, emailType, page, pageSize])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  return {
    logs,
    loading,
    error,
    totalCount,
    totalPages: Math.ceil(totalCount / pageSize),
    refresh: fetchLogs,
  }
}
