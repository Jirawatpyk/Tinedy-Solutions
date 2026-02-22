import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { useEmailLogs } from '@/hooks/use-email-logs'
import { formatDateTime } from '@/lib/utils'
import { getErrorMessage } from '@/lib/error-utils'
import { toast } from 'sonner'
import { Mail, RefreshCw, ChevronLeft, ChevronRight, AlertCircle, Trash2 } from 'lucide-react'
import { EMAIL_TYPES } from '@/constants/email-types'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'sent', label: 'Sent' },
  { value: 'failed', label: 'Failed' },
  { value: 'pending', label: 'Pending' },
]

const EMAIL_TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: EMAIL_TYPES.BOOKING_REMINDER, label: 'Booking Reminder' },
  { value: EMAIL_TYPES.BOOKING_CONFIRMATION, label: 'Booking Confirmation' },
  { value: EMAIL_TYPES.RECURRING_BOOKING_CONFIRMATION, label: 'Recurring Booking Confirmation' },
  { value: EMAIL_TYPES.PAYMENT_CONFIRMATION, label: 'Payment Confirmation' },
  { value: EMAIL_TYPES.REFUND_CONFIRMATION, label: 'Refund Confirmation' },
]

function getStatusBadge(status: string) {
  switch (status) {
    case 'sent':
      return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">Sent</Badge>
    case 'failed':
      return <Badge variant="destructive">Failed</Badge>
    case 'pending':
      return <Badge variant="secondary">Pending</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function formatEmailType(type: string) {
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function EmailLogsSection() {
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [showClearAll, setShowClearAll] = useState(false)
  const [deletingOne, setDeletingOne] = useState(false)
  const [clearingAll, setClearingAll] = useState(false)

  const { logs, loading, error, totalCount, totalPages, refresh, deleteLog, clearAllLogs } = useEmailLogs({
    status: statusFilter,
    emailType: typeFilter,
    page,
    pageSize: 20,
  })

  const handleStatusChange = (value: string) => {
    setStatusFilter(value)
    setPage(1)
  }

  const handleTypeChange = (value: string) => {
    setTypeFilter(value)
    setPage(1)
  }

  const handleDeleteOne = async () => {
    if (!deleteTarget) return
    try {
      setDeletingOne(true)
      await deleteLog(deleteTarget)
      toast.success('Email log deleted')
    } catch (err) {
      toast.error('Failed to delete', { description: getErrorMessage(err) })
    } finally {
      setDeletingOne(false)
      setDeleteTarget(null)
    }
  }

  const handleClearAll = async () => {
    try {
      setClearingAll(true)
      await clearAllLogs()
      toast.success('All email logs cleared')
      setPage(1)
    } catch (err) {
      toast.error('Failed to clear logs', { description: getErrorMessage(err) })
    } finally {
      setClearingAll(false)
      setShowClearAll(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Logs
            </CardTitle>
            <CardDescription>
              View sent emails and their delivery status
            </CardDescription>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {totalCount > 0 && (
              <Button variant="outline" size="sm" onClick={() => setShowClearAll(true)} disabled={loading} className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Clear All</span>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
              <RefreshCw className={`h-4 w-4 sm:mr-2 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex gap-3 mb-4">
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={handleTypeChange}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EMAIL_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Error state (hide while loading to avoid overlap) */}
        {error && !loading && (
          <div className="flex items-center gap-2 text-destructive text-sm mb-4">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && logs.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Mail className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No email logs found</p>
            <p className="text-xs mt-1">Emails will appear here once reminders are sent</p>
          </div>
        )}

        {/* Table */}
        {!loading && logs.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">Date</th>
                    <th className="pb-2 pr-4 font-medium text-muted-foreground hidden sm:table-cell">Type</th>
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">Recipient</th>
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">Status</th>
                    <th className="pb-2 pr-4 font-medium text-muted-foreground hidden md:table-cell">Attempts</th>
                    <th className="pb-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b last:border-0 group">
                      <td className="py-2.5 pr-4 text-xs text-muted-foreground">
                        <span className="whitespace-nowrap">{formatDateTime(log.sent_at || log.created_at)}</span>
                      </td>
                      <td className="py-2.5 pr-4 text-xs hidden sm:table-cell">
                        {formatEmailType(log.email_type)}
                      </td>
                      <td className="py-2.5 pr-4">
                        <div className="min-w-0">
                          {log.recipient_name && (
                            <p className="text-xs font-medium truncate">{log.recipient_name}</p>
                          )}
                          <p className="text-xs text-muted-foreground truncate">{log.recipient_email}</p>
                        </div>
                      </td>
                      <td className="py-2.5 pr-4">
                        <div className="space-y-1">
                          {getStatusBadge(log.status)}
                          {log.status === 'failed' && log.error_message && (
                            <p className="text-[10px] text-destructive truncate max-w-[200px]">{log.error_message}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 pr-4 text-xs text-muted-foreground hidden md:table-cell">
                        {log.attempts}/{log.max_attempts}
                      </td>
                      <td className="py-2.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                          onClick={() => setDeleteTarget(log.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-xs text-muted-foreground">
                  {totalCount} total records
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
        {/* Delete single log confirmation */}
        <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        title="Delete Email Log"
        description="Are you sure you want to delete this email log entry? This action cannot be undone."
        variant="destructive"
        confirmText="Delete"
        onConfirm={handleDeleteOne}
        isLoading={deletingOne}
      />

      {/* Clear all confirmation */}
      <ConfirmDialog
        open={showClearAll}
        onOpenChange={setShowClearAll}
        title="Clear All Email Logs"
        description={`Are you sure you want to delete all ${totalCount} email log${totalCount !== 1 ? 's' : ''}${statusFilter !== 'all' || typeFilter !== 'all' ? ' (filtered)' : ''}? This action cannot be undone.`}
        variant="destructive"
        confirmText="Clear All"
        onConfirm={handleClearAll}
        isLoading={clearingAll}
      />
      </CardContent>
    </Card>
  )
}
