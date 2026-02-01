/**
 * String Utility Functions
 *
 * Shared string manipulation utilities used across the application.
 */

/**
 * Get initials from a name string
 * @param name - Full name to extract initials from
 * @returns 1-2 character initials (uppercase) or '?' if name is invalid
 * @example
 * getInitials('John Doe') // 'JD'
 * getInitials('Alice') // 'A'
 * getInitials(null) // '?'
 */
export function getInitials(name: string | null | undefined): string {
  if (!name || typeof name !== 'string') return '?'
  const trimmed = name.trim()
  if (!trimmed) return '?'
  return trimmed
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
