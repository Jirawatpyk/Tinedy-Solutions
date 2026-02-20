import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { mapErrorToUserMessage } from '@/lib/error-messages'
import { AppSheet } from '@/components/ui/app-sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  TeamCreateSchema,
  TeamUpdateSchema,
  TeamCreateTransformSchema,
  TeamUpdateTransformSchema,
  type TeamCreateFormData,
} from '@/schemas'

export interface TeamMember {
  id: string
  full_name: string
  email: string
  phone: string | null
  avatar_url: string | null
  role: string
  is_active?: boolean
  membership_id?: string
}

export interface TeamForForm {
  id: string
  name: string
  description: string | null
  team_lead_id: string | null
  members?: TeamMember[]
}

export interface TeamFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  team?: TeamForForm | null
  staffList: TeamMember[]
  onSuccess: () => void
}

const defaultValues: TeamCreateFormData = {
  name: '',
  description: null,
  team_lead_id: null,
  is_active: true,
}

export function TeamFormSheet({
  open,
  onOpenChange,
  team,
  staffList,
  onSuccess,
}: TeamFormSheetProps) {
  const isEditMode = !!team

  const form = useForm<TeamCreateFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(isEditMode ? TeamUpdateSchema : TeamCreateSchema) as any,
    defaultValues,
  })

  // Sync form with team data on open; clear on close
  useEffect(() => {
    if (open && team) {
      form.reset({
        name: team.name,
        description: team.description,
        team_lead_id: team.team_lead_id,
        is_active: true,
      })
    } else if (!open) {
      form.reset(defaultValues)
    }
  }, [open, team, form])

  const onSubmit = async (data: TeamCreateFormData) => {
    try {
      if (isEditMode && team) {
        const transformedData = TeamUpdateTransformSchema.parse(data)

        const { error } = await supabase
          .from('teams')
          .update({
            name: transformedData.name,
            description: transformedData.description,
            team_lead_id: transformedData.team_lead_id,
          })
          .eq('id', team.id)

        if (error) throw error

        // If a new team lead was selected, auto-add as member if not already
        if (transformedData.team_lead_id) {
          const isAlreadyMember = team.members?.some(
            (m) => m.id === transformedData.team_lead_id
          )
          if (!isAlreadyMember) {
            const { error: memberError } = await supabase
              .from('team_members')
              .insert({
                team_id: team.id,
                staff_id: transformedData.team_lead_id,
                joined_at: new Date().toISOString(),
              })
            if (memberError) {
              console.error('Error adding team lead as member:', memberError)
            }
          }
        }

        toast.success(
          transformedData.team_lead_id &&
            !team.members?.some((m) => m.id === transformedData.team_lead_id)
            ? 'Team updated and team lead added as member'
            : 'Team updated successfully'
        )
      } else {
        const transformedData = TeamCreateTransformSchema.parse(data)

        const { data: newTeam, error: teamError } = await supabase
          .from('teams')
          .insert({
            name: transformedData.name,
            description: transformedData.description,
            team_lead_id: transformedData.team_lead_id,
            is_active: transformedData.is_active,
          })
          .select()
          .single()

        if (teamError) throw teamError

        if (transformedData.team_lead_id && newTeam) {
          const { error: memberError } = await supabase
            .from('team_members')
            .insert({
              team_id: newTeam.id,
              staff_id: transformedData.team_lead_id,
              joined_at: new Date().toISOString(),
            })
          if (memberError) {
            console.error('Error adding team lead as member:', memberError)
          }
        }

        toast.success(
          transformedData.team_lead_id
            ? 'Team created and team lead added as member'
            : 'Team created successfully'
        )
      }

      onOpenChange(false)
      onSuccess()
    } catch (error) {
      console.error('Error saving team:', error)
      const errorMessage = mapErrorToUserMessage(error, 'team')
      toast.error(errorMessage.title, { description: errorMessage.description })
    }
  }

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEditMode ? 'Edit Team' : 'Create New Team'}
      description={
        isEditMode ? 'Update team information' : 'Create a new team for your staff'
      }
      size="sm"
    >
      <div className="flex flex-col h-full">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <form onSubmit={form.handleSubmit(onSubmit as any)} className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto px-6 space-y-4 pb-20">
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <div className="space-y-2">
                  <Label htmlFor="teamName">Team Name *</Label>
                  <Input
                    id="teamName"
                    {...field}
                    placeholder="e.g., Sales Team, Support Team"
                  />
                  {fieldState.error && (
                    <p className="text-xs text-destructive">{fieldState.error.message}</p>
                  )}
                </div>
              )}
            />

            <Controller
              name="description"
              control={form.control}
              render={({ field, fieldState }) => (
                <div className="space-y-2">
                  <Label htmlFor="teamDescription">Description</Label>
                  <Input
                    id="teamDescription"
                    {...field}
                    value={field.value || ''}
                    placeholder="Brief description of the team"
                  />
                  {fieldState.error && (
                    <p className="text-xs text-destructive">{fieldState.error.message}</p>
                  )}
                </div>
              )}
            />

            <Controller
              name="team_lead_id"
              control={form.control}
              render={({ field, fieldState }) => (
                <div className="space-y-2">
                  <Label htmlFor="teamLead">Team Lead</Label>
                  <Select
                    value={field.value || undefined}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select team lead (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {staffList.map((staff) => (
                        <SelectItem key={staff.id} value={staff.id}>
                          {staff.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.error && (
                    <p className="text-xs text-destructive">{fieldState.error.message}</p>
                  )}
                </div>
              )}
            />
          </div>

          {/* Sticky footer */}
          <div className="sticky bottom-0 bg-background border-t pt-4 pb-6 flex gap-2 px-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={form.formState.isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-tinedy-blue"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting
                ? isEditMode
                  ? 'Updating...'
                  : 'Creating...'
                : isEditMode
                  ? 'Save Changes'
                  : 'Create Team'}
            </Button>
          </div>
        </form>
      </div>
    </AppSheet>
  )
}
