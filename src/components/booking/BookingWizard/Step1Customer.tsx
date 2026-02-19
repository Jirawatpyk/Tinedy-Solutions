/**
 * Step1Customer — Customer search Combobox + new customer expand panel
 *
 * Features:
 * - EC-U1: 0 results → "ไม่พบลูกค้า" + [➕ เพิ่มลูกค้าใหม่] CTA (pre-fills name)
 * - EC-U5: After SELECT_CUSTOMER → read-only display + [× เปลี่ยน] button
 * - New customer panel: name, phone, email fields only
 */

import { useState, useRef, useEffect } from 'react'
import { Search, UserPlus, X, User } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { useCustomerSearch } from '@/hooks/use-customer-search'
import type { WizardState, WizardAction } from '@/hooks/use-booking-wizard'

interface Step1CustomerProps {
  state: WizardState
  dispatch: React.Dispatch<WizardAction>
}

export function Step1Customer({ state, dispatch }: Step1CustomerProps) {
  const { customer, isNewCustomer, newCustomerData, validationErrors } = state
  const [open, setOpen] = useState(false)
  const { customers, isLoading, search, setSearch } = useCustomerSearch()
  const nameInputRef = useRef<HTMLInputElement>(null)

  // Focus name input when new customer panel opens
  useEffect(() => {
    if (isNewCustomer) {
      setTimeout(() => nameInputRef.current?.focus(), 100)
    }
  }, [isNewCustomer])

  function handleSelectCustomer(selected: (typeof customers)[0]) {
    dispatch({ type: 'SELECT_CUSTOMER', customer: selected })
    setOpen(false)
    setSearch('')
  }

  function handleAddNew() {
    // EC-U1: pre-fill name with current search text
    dispatch({ type: 'SET_NEW_CUSTOMER', isNewCustomer: true })
    if (search && !newCustomerData.full_name) {
      dispatch({ type: 'UPDATE_NEW_CUSTOMER', field: 'full_name', value: search })
    }
    setOpen(false)
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
        <h2 className="text-base font-semibold" tabIndex={-1}>ขั้นตอนที่ 1: เลือกลูกค้า</h2>
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
            เปลี่ยน
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
      <h2 className="text-base font-semibold" tabIndex={-1}>ขั้นตอนที่ 1: เลือกลูกค้า</h2>

      {/* Customer search Combobox */}
      {!isNewCustomer && (
        <div className="space-y-1">
          <Label className="text-sm">ค้นหาลูกค้า</Label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-start font-normal"
              >
                <Search className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-muted-foreground">ค้นหาชื่อ, เบอร์, อีเมล...</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder="พิมพ์เพื่อค้นหา..."
                  value={search}
                  onValueChange={setSearch}
                />
                <CommandList>
                  {isLoading && (
                    <div className="py-3 text-center text-sm text-muted-foreground">
                      กำลังค้นหา...
                    </div>
                  )}

                  {/* EC-U1: Empty state with CTA */}
                  {!isLoading && search.length >= 2 && customers.length === 0 && (
                    <CommandEmpty>
                      <div className="py-4 flex flex-col items-center gap-2">
                        <p className="text-sm text-muted-foreground">ไม่พบลูกค้า "{search}"</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleAddNew}
                          className="gap-1"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          เพิ่มลูกค้าใหม่
                        </Button>
                      </div>
                    </CommandEmpty>
                  )}

                  {!isLoading && search.length < 2 && (
                    <div className="py-3 text-center text-xs text-muted-foreground">
                      พิมพ์อย่างน้อย 2 ตัวอักษร
                    </div>
                  )}

                  {customers.length > 0 && (
                    <CommandGroup heading="ลูกค้า">
                      {customers.map((c) => (
                        <CommandItem
                          key={c.id}
                          value={c.id}
                          onSelect={() => handleSelectCustomer(c)}
                        >
                          <div className="flex flex-col min-w-0">
                            <span className="font-medium text-sm">{c.full_name}</span>
                            <span className="text-xs text-muted-foreground">{c.phone}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
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
            <span className="bg-background px-2 text-muted-foreground">หรือ</span>
          </div>
        </div>
      )}

      {!isNewCustomer && (
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => dispatch({ type: 'SET_NEW_CUSTOMER', isNewCustomer: true })}
        >
          <UserPlus className="h-4 w-4" />
          เพิ่มลูกค้าใหม่
        </Button>
      )}

      {/* New customer form */}
      {isNewCustomer && (
        <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">ข้อมูลลูกค้าใหม่</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => dispatch({ type: 'SET_NEW_CUSTOMER', isNewCustomer: false })}
              className="text-muted-foreground"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              ยกเลิก
            </Button>
          </div>

          <div className="space-y-1">
            <Label htmlFor="new_name" className="text-xs text-muted-foreground">
              ชื่อ-นามสกุล <span className="text-destructive">*</span>
            </Label>
            <Input
              id="new_name"
              ref={nameInputRef}
              placeholder="กรอกชื่อ-นามสกุล"
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
              เบอร์โทรศัพท์ <span className="text-destructive">*</span>
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
              อีเมล (ไม่บังคับ)
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
