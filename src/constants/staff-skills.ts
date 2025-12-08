/**
 * Staff Skill Suggestions
 * Pre-defined skills for staff members
 */

export const STAFF_SKILL_SUGGESTIONS = [
  // Cleaning Services
  'Cleaning',
  'Deep Cleaning',
  'Window Cleaning',
  'Carpet Cleaning',
  // Technical Services
  'Plumbing',
  'Electrical',
  'AC Service',
  'Appliance Repair',
  // General Services
  'Maintenance',
  'Painting',
  'Moving',
  'Assembly',
  // Specialized Services
  'Pest Control',
  'Garden',
  'Laundry',
  'Disinfection',
] as const

export type StaffSkill = (typeof STAFF_SKILL_SUGGESTIONS)[number]

/**
 * Get color for skill badge (optional - all use default gray)
 */
export function getSkillColor(skill: string): string {
  const normalizedSkill = skill.toLowerCase()

  // Cleaning services - blue
  if (['cleaning', 'deep cleaning', 'window cleaning', 'carpet cleaning'].includes(normalizedSkill)) {
    return 'bg-blue-100 text-blue-800 border-blue-200'
  }

  // Technical services - orange
  if (['plumbing', 'electrical', 'ac service', 'appliance repair'].includes(normalizedSkill)) {
    return 'bg-orange-100 text-orange-800 border-orange-200'
  }

  // General services - green
  if (['maintenance', 'painting', 'moving', 'assembly'].includes(normalizedSkill)) {
    return 'bg-green-100 text-green-800 border-green-200'
  }

  // Specialized services - purple
  if (['pest control', 'garden', 'laundry', 'disinfection'].includes(normalizedSkill)) {
    return 'bg-purple-100 text-purple-800 border-purple-200'
  }

  // Default - gray
  return 'bg-gray-100 text-gray-800 border-gray-200'
}
