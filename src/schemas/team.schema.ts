import { z } from 'zod'

/**
 * Team Management Schemas
 *
 * Architecture:
 * - TeamSchema: สำหรับสร้าง/แก้ไขทีม
 * - AddTeamMemberSchema: สำหรับเพิ่มสมาชิกในทีม
 *
 * Related Tables:
 * - teams: Main team table
 * - team_members: Team membership junction table
 * - profiles: Staff information
 *
 * Business Rules:
 * - Team lead จะถูก auto-add เป็น member ด้วย role='leader'
 * - สมาชิกไม่สามารถซ้ำในทีมเดียวกันได้
 * - ทีมสามารถมีหลาย leaders ได้
 */

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Team Member Role Enum
 */
export const TeamMemberRoleEnum = z.enum(['leader', 'member'])

// ============================================================================
// TEAM SCHEMA
// ============================================================================

/**
 * Schema สำหรับสร้างทีมใหม่
 */
export const TeamCreateSchema = z.object({
  name: z
    .string({ message: 'Team name is required' })
    .min(1, 'Team name must not be empty')
    .max(200, 'Team name must not exceed 200 characters'),

  description: z
    .string()
    .max(1000, 'Description must not exceed 1000 characters')
    .nullable()
    .optional()
    .or(z.literal('')),

  team_lead_id: z
    .string()
    .uuid('Invalid team lead ID')
    .nullable()
    .optional()
    .or(z.literal('')),

  is_active: z.boolean(),
})

/**
 * Schema สำหรับแก้ไขทีม (ทุกฟิลด์เป็น optional)
 */
export const TeamUpdateSchema = TeamCreateSchema.partial()

/**
 * Transform schema สำหรับแปลง empty string เป็น null
 */
export const TeamCreateTransformSchema = TeamCreateSchema.transform((data) => ({
  name: data.name,
  description: data.description || null,
  team_lead_id: data.team_lead_id || null,
  is_active: data.is_active,
}))

export const TeamUpdateTransformSchema = TeamUpdateSchema.transform((data) => ({
  ...data,
  description: data.description === '' ? null : data.description,
  team_lead_id: data.team_lead_id === '' ? null : data.team_lead_id,
}))

// ============================================================================
// TEAM MEMBER SCHEMA
// ============================================================================

/**
 * Schema สำหรับเพิ่มสมาชิกในทีม
 */
export const AddTeamMemberSchema = z.object({
  team_id: z
    .string({ message: 'Team is required' })
    .uuid('Invalid team ID'),

  staff_id: z
    .string({ message: 'Staff member is required' })
    .uuid('Invalid staff ID'),

  role: TeamMemberRoleEnum,
})

/**
 * Schema สำหรับอัปเดตบทบาทสมาชิกในทีม
 */
export const UpdateTeamMemberRoleSchema = z.object({
  team_member_id: z
    .string({ message: 'Team member is required' })
    .uuid('Invalid team member ID'),

  role: TeamMemberRoleEnum,
})

/**
 * Schema สำหรับเปลี่ยนสถานะสมาชิกในทีม
 */
export const ToggleTeamMemberStatusSchema = z.object({
  team_member_id: z
    .string({ message: 'Team member is required' })
    .uuid('Invalid team member ID'),

  is_active: z.boolean({ message: 'Status is required' }),
})

// ============================================================================
// BULK OPERATIONS SCHEMA
// ============================================================================

/**
 * Schema สำหรับเพิ่มสมาชิกหลายคนพร้อมกัน
 */
export const BulkAddTeamMembersSchema = z.object({
  team_id: z
    .string({ message: 'Team is required' })
    .uuid('Invalid team ID'),

  staff_ids: z
    .array(z.string().uuid('Invalid staff ID'))
    .min(1, 'Please select at least 1 staff member'),

  role: TeamMemberRoleEnum,
})

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * ตรวจสอบว่าสมาชิกไม่ซ้ำในทีม
 * @param existingMembers - Array of existing staff IDs in the team
 * @param newStaffId - New staff ID to add
 * @returns boolean
 */
export const validateNoDuplicateMember = (
  existingMembers: string[],
  newStaffId: string
): boolean => {
  if (existingMembers.includes(newStaffId)) {
    throw new Error('This staff member is already in the team')
  }
  return true
}

/**
 * ตรวจสอบว่าทีมมีสมาชิกอย่างน้อย 1 คน
 * @param memberCount - Number of members in team
 * @returns boolean
 */
export const validateMinimumMembers = (memberCount: number): boolean => {
  if (memberCount < 1) {
    throw new Error('Team must have at least 1 member')
  }
  return true
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type TeamCreateFormData = z.infer<typeof TeamCreateSchema>
export type TeamUpdateFormData = z.infer<typeof TeamUpdateSchema>
export type TeamCreateData = z.infer<typeof TeamCreateTransformSchema>
export type TeamUpdateData = z.infer<typeof TeamUpdateTransformSchema>
export type AddTeamMemberFormData = z.infer<typeof AddTeamMemberSchema>
export type UpdateTeamMemberRoleFormData = z.infer<typeof UpdateTeamMemberRoleSchema>
export type ToggleTeamMemberStatusFormData = z.infer<typeof ToggleTeamMemberStatusSchema>
export type BulkAddTeamMembersFormData = z.infer<typeof BulkAddTeamMembersSchema>
export type TeamMemberRole = z.infer<typeof TeamMemberRoleEnum>
