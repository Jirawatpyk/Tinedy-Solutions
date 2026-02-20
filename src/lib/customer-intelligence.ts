import { supabase } from '@/lib/supabase'
import { getBangkokDateString } from '@/lib/utils'

const HIGH_VALUE_THRESHOLD = 15000
const FREQUENT_BOOKER_THRESHOLD = 5
const NOTES_MAX_LENGTH = 1000

export const AUTO_TAGS: string[] = ['High Value', 'Frequent Booker']

export async function getCustomerStats(
  customerId: string
): Promise<{ paidBookings: number; totalSpend: number }> {
  const { data, error } = await supabase
    .from('bookings')
    .select('total_price')
    .eq('customer_id', customerId)
    .eq('status', 'completed')
    .eq('payment_status', 'paid')

  if (error || !data) return { paidBookings: 0, totalSpend: 0 }

  return {
    paidBookings: data.length,
    totalSpend: data.reduce((sum, b) => sum + (b.total_price ?? 0), 0),
  }
}

export async function checkAndUpdateCustomerIntelligence(
  customerId: string
): Promise<void> {
  // 1. Fetch customer
  const { data: customer, error } = await supabase
    .from('customers')
    .select('relationship_level, relationship_level_locked, tags, notes')
    .eq('id', customerId)
    .single()

  if (error || !customer) return

  // 2. Skip if locked
  if (customer.relationship_level_locked === true) return

  const currentLevel = customer.relationship_level as string

  // 3. Get stats via JS aggregation
  const { paidBookings, totalSpend } = await getCustomerStats(customerId)

  // 4. Determine new level (never downgrade from vip)
  let newLevel = currentLevel
  if (currentLevel !== 'vip') {
    if (paidBookings >= FREQUENT_BOOKER_THRESHOLD || totalSpend >= HIGH_VALUE_THRESHOLD) {
      newLevel = 'vip'
    } else if (paidBookings >= 1) {
      newLevel = 'regular'
    }
  }

  // 5. Determine auto-tags to add
  const autoTagsToAdd: string[] = []
  if (totalSpend >= HIGH_VALUE_THRESHOLD) autoTagsToAdd.push('High Value')
  if (paidBookings >= FREQUENT_BOOKER_THRESHOLD) autoTagsToAdd.push('Frequent Booker')

  // 6. Merge tags (dedupe, preserve manual tags)
  const mergedTags = [...new Set([...(customer.tags ?? []), ...autoTagsToAdd])]
  const tagsChanged = mergedTags.length !== (customer.tags ?? []).length

  // 7. If level changed — update level + tags + append auto-note
  if (newLevel !== currentLevel) {
    const spendStr = totalSpend > 0 ? `, ฿${totalSpend.toLocaleString('th-TH')} total spend` : ''
    const bookingStr = `${paidBookings} completed booking${paidBookings !== 1 ? 's' : ''}`
    const autoNote = `[Auto] ${getBangkokDateString()} — Relationship upgraded: ${currentLevel} → ${newLevel} (${bookingStr}${spendStr})`
    // Cap notes to NOTES_MAX_LENGTH: preserve full auto-note, trim existing prefix if needed
    const separator = '\n\n'
    const maxPrefixLen = NOTES_MAX_LENGTH - separator.length - autoNote.length
    const existingNotes = customer.notes ?? ''
    const trimmedPrefix =
      existingNotes.length > maxPrefixLen
        ? existingNotes.slice(existingNotes.length - maxPrefixLen)
        : existingNotes
    const updatedNotes = trimmedPrefix ? `${trimmedPrefix}${separator}${autoNote}` : autoNote

    const { error: updateErr } = await supabase
      .from('customers')
      .update({ relationship_level: newLevel, tags: mergedTags, notes: updatedNotes })
      .eq('id', customerId)

    if (updateErr) console.warn('[customer-intelligence] update failed:', updateErr.message)

    return
  }

  // 8. Only tags changed — update tags only
  if (tagsChanged) {
    const { error: tagsErr } = await supabase
      .from('customers')
      .update({ tags: mergedTags })
      .eq('id', customerId)

    if (tagsErr) console.warn('[customer-intelligence] tags update failed:', tagsErr.message)
  }
}
