/**
 * Step1Customer — Customer search Combobox + new customer expand panel
 *
 * Features:
 * - EC-U1: 0 results → "No customers found" + [➕ Add New Customer] CTA (pre-fills name)
 * - EC-U5: After SELECT_CUSTOMER → read-only display + [× Change] button
 * - New customer panel: name, phone, email fields only
 */

import { useRef, useEffect, useCallback } from 'react'
import { UserPlus, X, User } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useCustomerSearch } from '@/hooks/use-customer-search'
import type { WizardState, WizardAction } from '@/hooks/use-booking-wizard'

interface Step1CustomerProps {
  state: WizardState
  dispatch: React.Dispatch<WizardAction>
}

export function Step1Customer({ state, dispatch }: Step1CustomerProps) {
  const { customer, isNewCustomer, newCustomerData, validationErrors } = state
  const { customers, isLoading, search, setSearch } = useCustomerSearch()
  const nameInputRef = useRef<HTMLInputElement>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  // Focus name input when new customer panel opens (M3: rAF is more reliable than setTimeout)
  useEffect(() => {
    if (isNewCustomer) {
      const raf = requestAnimationFrame(() => nameInputRef.current?.focus())
      return () => cancelAnimationFrame(raf)
    }
  }, [isNewCustomer])

  // M4: Close dropdown on click-outside or Escape
  const closeDropdown = useCallback(() => setSearch(''), [setSearch])
  useEffect(() => {
    if (search.length < 2) return
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        closeDropdown()
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') closeDropdown()
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [search.length, closeDropdown])

  function handleSelectCustomer(selected: (typeof customers)[0]) {
    dispatch({ type: 'SELECT_CUSTOMER', customer: selected })
    setSearch('')
  }

  function handleAddNew() {
    // EC-U1: pre-fill name with current search text
    dispatch({ type: 'SET_NEW_CUSTOMER', isNewCustomer: true })
    if (search && !newCustomerData.full_name) {
      dispatch({ type: 'UPDATE_NEW_CUSTOMER', field: 'full_name', value: search })
    }
    setSearch('')
  }

  function handleClearCustomer() {
    dispatch({ type: 'CLEAR_CUSTOMER' })
    dispatch({ type: 'SET_NEW_CUSTOMER', isNewCustomer: false })
  }

  // EC-U5: Show read-only when customer selected
  if (customer && !isNewCustomer) {
    return (
      <div className="space-y-4">
        <h2 className="text-base font-semibold" tabIndex={-1}>Step 1: Select Customer</h2>
        <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-tinedy-blue/10 flex items-center justify-center shrink-0">
              <User className="h-4 w-4 text-tinedy-blue" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{customer.full_name}</p>
              <p className="text-xs text-muted-foreground truncate">{customer.phone}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearCustomer}
            className="shrink-0 text-muted-foreground"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Change
          </Button>
        </div>
        {validationErrors.customer && (
          <p className="text-xs text-destructive">{validationErrors.customer}</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold" tabIndex={-1}>Step 1: Select Customer</h2>

      {/* Customer search — inline (no Popover portal to avoid Sheet event conflicts) */}
      {!isNewCustomer && (
        <div className="space-y-1" ref={searchContainerRef}>
          <Label className="text-sm">Search Customer</Label>
          <div className="relative">
            <Input
              placeholder="Search by name, phone, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-8"
            />
            {isLoading && (
              <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">...</span>
            )}
          </div>

          {/* H3: Hint when only 1 char typed */}
          {search.length === 1 && (
            <p className="text-xs text-muted-foreground px-1">Type at least 2 characters to search</p>
          )}

          {/* Results dropdown */}
          {search.length >= 2 && (
            <div className="border rounded-md bg-background shadow-sm">
              {isLoading && (
                <p className="py-3 text-center text-sm text-muted-foreground">Searching...</p>
              )}

              {!isLoading && customers.length === 0 && (
                <p className="py-3 text-center text-sm text-muted-foreground">
                  No customers found for "{search}"
                </p>
              )}

              {customers.length > 0 && (
                <ul className="max-h-48 overflow-y-auto py-1">
                  {customers.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-muted transition-colors flex flex-col min-w-0"
                        onClick={() => handleSelectCustomer(c)}
                      >
                        <span className="font-medium text-sm">{c.full_name}</span>
                        <span className="text-xs text-muted-foreground">{c.phone}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {validationErrors.customer && (
            <p className="text-xs text-destructive">{validationErrors.customer}</p>
          )}
        </div>
      )}

      {/* Add new customer toggle */}
      {!isNewCustomer && (
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">or</span>
          </div>
        </div>
      )}

      {!isNewCustomer && (
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={handleAddNew}
        >
          <UserPlus className="h-4 w-4" />
          Add New Customer
        </Button>
      )}

      {/* New customer form */}
      {isNewCustomer && (
        <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">New Customer</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => dispatch({ type: 'SET_NEW_CUSTOMER', isNewCustomer: false })}
              className="text-muted-foreground"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Cancel
            </Button>
          </div>

          <div className="space-y-1">
            <Label htmlFor="new_name" className="text-xs text-muted-foreground">
              Full Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="new_name"
              ref={nameInputRef}
              placeholder="Enter full name"
              value={newCustomerData.full_name}
              onChange={(e) =>
                dispatch({ type: 'UPDATE_NEW_CUSTOMER', field: 'full_name', value: e.target.value })
              }
              className={cn(validationErrors.new_customer_name && 'border-destructive')}
            />
            {validationErrors.new_customer_name && (
              <p className="text-xs text-destructive">{validationErrors.new_customer_name}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="new_phone" className="text-xs text-muted-foreground">
              Phone <span className="text-destructive">*</span>
            </Label>
            <Input
              id="new_phone"
              type="tel"
              placeholder="0812345678"
              value={newCustomerData.phone}
              onChange={(e) =>
                dispatch({ type: 'UPDATE_NEW_CUSTOMER', field: 'phone', value: e.target.value })
              }
              className={cn(validationErrors.new_customer_phone && 'border-destructive')}
            />
            {validationErrors.new_customer_phone && (
              <p className="text-xs text-destructive">{validationErrors.new_customer_phone}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="new_email" className="text-xs text-muted-foreground">
              Email (optional)
            </Label>
            <Input
              id="new_email"
              type="email"
              placeholder="example@email.com"
              value={newCustomerData.email}
              onChange={(e) =>
                dispatch({ type: 'UPDATE_NEW_CUSTOMER', field: 'email', value: e.target.value })
              }
            />
          </div>
        </div>
      )}
    </div>
  )
}
