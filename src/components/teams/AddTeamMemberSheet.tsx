import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { getTeamMemberError } from '@/lib/error-messages'
import { AppSheet } from '@/components/ui/app-sheet'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AddTeamMemberSchema, type AddTeamMemberFormData } from '@/schemas'
import type { TeamMember, TeamForForm } from './TeamFormSheet'

export interface AddTeamMemberSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  team: TeamForForm
  availableStaff: TeamMember[]
  onSuccess: () => void
}

export function AddTeamMemberSheet({
  open,
  onOpenChange,
  team,
  availableStaff,
  onSuccess,
}: AddTeamMemberSheetProps) {
  const form = useForm<AddTeamMemberFormData>({
    resolver: zodResolver(AddTeamMemberSchema),
    defaultValues: {
      team_id: team.id,
      staff_id: '',
      role: 'member',
    },
  })

  // Sync team_id on open; reset staff selection on close (keep valid team_id)
  useEffect(() => {
    if (open) {
      form.reset({ team_id: team.id, staff_id: '', role: 'member' })
    } else {
      form.reset({ team_id: team.id, staff_id: '', role: 'member' })
    }
  }, [open, team.id, form])

  const onSubmit = async (data: AddTeamMemberFormData) => {
    try {
      // Check if staff is currently an ACTIVE member (to prevent duplicates)
      const { data: activeMember } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', data.team_id)
        .eq('staff_id', data.staff_id)
        .is('left_at', null)
        .maybeSingle()

      if (activeMember) {
        toast.error('Already a Member', {
          description: 'This staff member is already in the team.',
        })
        return
      }

      const { error } = await supabase.from('team_members').insert({
        team_id: data.team_id,
        staff_id: data.staff_id,
        joined_at: new Date().toISOString(),
      })

      if (error) throw error

      toast.success('Member added successfully')
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      console.error('Error adding member:', error)

      const errorObj = error as { code?: string; message?: string }
      if (errorObj?.code === '23505' || errorObj?.message?.includes('unique')) {
        toast.error('Already a Member', {
          description: 'This staff member is already in the team.',
        })
        return
      }

      const errorMessage = getTeamMemberError('add')
      toast.error(errorMessage.title, { description: errorMessage.description })
    }
  }

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Add Member — ${team.name}`}
      size="sm"
    >
      <div className="flex flex-col h-full">
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto px-6 space-y-4 pb-20">
            {availableStaff.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                All staff members are already in this team.
              </p>
            ) : (
              <Controller
                name="staff_id"
                control={form.control}
                render={({ field, fieldState }) => (
                  <div className="space-y-2">
                    <Label htmlFor="staffSelect">Select Staff Member</Label>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a staff member" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableStaff.map((staff) => (
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
            )}
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
              {form.formState.isSubmitting ? 'Adding...' : 'Add Member'}
            </Button>
          </div>
        </form>
      </div>
    </AppSheet>
  )
}
