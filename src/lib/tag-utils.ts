// Tag color mapping utility
export const getTagColor = (tag: string): string => {
  const tagLower = tag.toLowerCase()

  // Behavior tags
  if (['vip', 'returner'].includes(tagLower)) return 'bg-amber-100 text-amber-700 border-amber-300'
  if (['regular'].includes(tagLower)) return 'bg-green-100 text-green-700 border-green-300'
  if (['first-timer'].includes(tagLower)) return 'bg-blue-100 text-blue-700 border-blue-300'

  // Type tags
  if (['corporate'].includes(tagLower)) return 'bg-indigo-100 text-indigo-700 border-indigo-300'
  if (['individual', 'walk-in'].includes(tagLower)) return 'bg-slate-100 text-slate-700 border-slate-300'

  // Marketing tags
  if (['newsletter', 'promotion', 'birthday-reminder'].includes(tagLower)) return 'bg-purple-100 text-purple-700 border-purple-300'

  // Notes tags
  if (['special-needs'].includes(tagLower)) return 'bg-cyan-100 text-cyan-700 border-cyan-300'
  if (['payment-issue', 'complaint'].includes(tagLower)) return 'bg-red-100 text-red-700 border-red-300'

  // Value tags
  if (['high-value'].includes(tagLower)) return 'bg-emerald-100 text-emerald-700 border-emerald-300'
  if (['medium-value'].includes(tagLower)) return 'bg-yellow-100 text-yellow-700 border-yellow-300'
  if (['low-value'].includes(tagLower)) return 'bg-orange-100 text-orange-700 border-orange-300'

  // Default
  return 'bg-gray-100 text-gray-700 border-gray-300'
}
