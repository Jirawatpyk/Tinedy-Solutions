/**
 * Step3Assignment — Staff/Team assignment + address section + notes
 *
 * Features:
 * - Staff / Team / None radio selector
 * - A10: "Use customer address" checkbox — disabled if customer has no address
 * - Address form (pre-filled from customer or manual entry)
 * - Notes field
 * - A3: Loading skeleton for staff/team dropdowns
 */

import { Users, User, MapPin } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useQuery } from '@tanstack/react-query'
import { staffQueryOptions } from '@/lib/queries/staff-queries'
import { teamQueryOptions } from '@/lib/queries/team-queries'
import type { WizardState, WizardAction } from '@/hooks/use-booking-wizard'

interface Step3AssignmentProps {
  state: WizardState
  dispatch: React.Dispatch<WizardAction>
}

export function Step3Assignment({ state, dispatch }: Step3AssignmentProps) {
  const {
    assignmentType,
    staff_id,
    team_id,
    useCustomerAddress,
    address,
    city,
    zip_code,
    notes,
    customer,
    validationErrors,
  } = state

  const { data: staffList = [], isLoading: staffLoading } = useQuery(
    staffQueryOptions.listSimple('staff')
  )
  const { data: teams = [], isLoading: teamsLoading } = useQuery(
    teamQueryOptions.listSimple()
  )

  const customerHasAddress = !!(customer?.address)

  return (
    <div className="space-y-5">
      <h2 className="text-base font-semibold" tabIndex={-1}>Step 3: Assignment</h2>

      {/* Assignment type */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Assign To</Label>
        <RadioGroup
          value={assignmentType}
          onValueChange={(val) =>
            dispatch({
              type: 'SET_ASSIGNMENT_TYPE',
              assignmentType: val as 'staff' | 'team' | 'none',
            })
          }
          className="flex flex-col gap-2"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="none" id="assign-none" />
            <Label htmlFor="assign-none" className="cursor-pointer text-sm text-muted-foreground">
              Unassigned
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="staff" id="assign-staff" />
            <Label htmlFor="assign-staff" className="cursor-pointer text-sm flex items-center gap-1">
              <User className="h-3.5 w-3.5" /> Staff
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="team" id="assign-team" />
            <Label htmlFor="assign-team" className="cursor-pointer text-sm flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> Team
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Staff selector */}
      {assignmentType === 'staff' && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Select Staff</Label>
          {staffLoading ? (
            <div className="h-10 bg-muted rounded-md animate-pulse" aria-label="Loading..." />
          ) : (
            <Select
              value={staff_id ?? ''}
              onValueChange={(id) =>
                dispatch({ type: 'SET_STAFF', staffId: id || null })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select staff" />
              </SelectTrigger>
              <SelectContent>
                {staffList.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* Team selector */}
      {assignmentType === 'team' && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Select Team</Label>
          {teamsLoading ? (
            <div className="h-10 bg-muted rounded-md animate-pulse" aria-label="Loading..." />
          ) : (
            <Select
              value={team_id ?? ''}
              onValueChange={(id) =>
                dispatch({ type: 'SET_TEAM', teamId: id || null })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select team" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* Address section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-medium">Service Address</Label>
        </div>

        {/* A10: Customer address checkbox — disabled if no customer address */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="use-customer-address"
            checked={useCustomerAddress}
            disabled={!customerHasAddress}
            onCheckedChange={(checked) =>
              dispatch({
                type: 'TOGGLE_CUSTOMER_ADDRESS',
                useCustomerAddress: checked === true,
              })
            }
          />
          <Label
            htmlFor="use-customer-address"
            className={`text-sm cursor-pointer ${!customerHasAddress ? 'text-muted-foreground' : ''}`}
          >
            Use customer address
          </Label>
        </div>
        {!customerHasAddress && customer && (
          <p className="text-xs text-muted-foreground ml-6">
            Customer has no saved address. Please enter below.
          </p>
        )}

        {/* Address fields */}
        <div className="space-y-2">
          <div className="space-y-1">
            <Label htmlFor="address" className="text-xs text-muted-foreground">
              Address <span className="text-destructive">*</span>
            </Label>
            <Input
              id="address"
              placeholder="Street address"
              value={address}
              onChange={(e) =>
                dispatch({ type: 'SET_ADDRESS', field: 'address', value: e.target.value })
              }
              disabled={useCustomerAddress}
              className={validationErrors.address ? 'border-destructive' : undefined}
            />
            {validationErrors.address && (
              <p className="text-xs text-destructive">{validationErrors.address}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="city" className="text-xs text-muted-foreground">
                City/District <span className="text-destructive">*</span>
              </Label>
              <Input
                id="city"
                placeholder="Bangkok"
                value={city}
                onChange={(e) =>
                  dispatch({ type: 'SET_ADDRESS', field: 'city', value: e.target.value })
                }
                disabled={useCustomerAddress}
                className={validationErrors.city ? 'border-destructive' : undefined}
              />
              {validationErrors.city && (
                <p className="text-xs text-destructive">{validationErrors.city}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="zip_code" className="text-xs text-muted-foreground">
                Zip Code
              </Label>
              <Input
                id="zip_code"
                placeholder="10110"
                value={zip_code}
                onChange={(e) =>
                  dispatch({ type: 'SET_ADDRESS', field: 'zip_code', value: e.target.value })
                }
                disabled={useCustomerAddress}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1">
        <Label htmlFor="notes" className="text-sm font-medium">
          Notes (optional)
        </Label>
        <Textarea
          id="notes"
          placeholder="Additional information..."
          value={notes}
          onChange={(e) => dispatch({ type: 'SET_NOTES', notes: e.target.value })}
          rows={3}
          className="resize-none"
        />
      </div>
    </div>
  )
}
