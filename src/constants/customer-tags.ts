/**
 * Customer Tag Suggestions
 * Pre-defined tags based on Epic document for customer categorization
 */

export const CUSTOMER_TAG_SUGGESTIONS = [
  // Behavior
  'VIP',
  'Regular',
  'First-timer',
  'Returner',
  // Type
  'Corporate',
  'Individual',
  'Walk-in',
  // Marketing
  'Newsletter',
  'Promotion',
  'Birthday-reminder',
  // Notes
  'Special-needs',
  'Payment-issue',
  'Complaint',
  // Value
  'High-value',
  'Medium-value',
  'Low-value',
] as const

export type CustomerTag = (typeof CUSTOMER_TAG_SUGGESTIONS)[number]
