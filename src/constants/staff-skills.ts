/**
 * Staff Skill Suggestions
 * Pre-defined skills for staff members
 */

export const STAFF_SKILL_SUGGESTIONS = [
  'Cleaning',
  'Training',
  // TODO: เพิ่มเพิ่มเติมภายหลัง
  // 'Deep Cleaning',
  // 'Window Cleaning',
  // 'Carpet Cleaning',
  // 'Plumbing',
  // 'Electrical',
  // 'AC Service',
  // 'Appliance Repair',
  // 'Maintenance',
  // 'Painting',
  // 'Moving',
  // 'Assembly',
  // 'Pest Control',
  // 'Garden',
  // 'Laundry',
  // 'Disinfection',
] as const

export type StaffSkill = (typeof STAFF_SKILL_SUGGESTIONS)[number]

/**
 * Get color for skill badge (optional - all use default gray)
 */
export function getSkillColor(skill: string): string {
  const normalizedSkill = skill.toLowerCase()

  // Training - cyan/teal
  if (normalizedSkill === 'training') {
    return 'bg-cyan-100 text-cyan-800 border-cyan-200'
  }

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
