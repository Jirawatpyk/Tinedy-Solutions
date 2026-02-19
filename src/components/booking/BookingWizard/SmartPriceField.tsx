/**
 * SmartPriceField — Package / Override / Custom Job pricing UI
 *
 * Modes:
 * - package: select V2 package → price auto-filled
 * - override: select package first → enable custom price override
 * - custom: enter job_name + custom_price manually (no package needed)
 *
 * UX: Switching Package→Custom shows confirm dialog if fields filled (spec req 1)
 */

import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import { PriceMode } from '@/types/booking'
import type { WizardState, WizardAction } from '@/hooks/use-booking-wizard'
import type { ServicePackageV2WithTiers } from '@/lib/queries/package-queries'

interface SmartPriceFieldProps {
  state: WizardState
  dispatch: React.Dispatch<WizardAction>
  packages: ServicePackageV2WithTiers[]
  packagesLoading?: boolean
}

export function SmartPriceField({
  state,
  dispatch,
  packages,
  packagesLoading,
}: SmartPriceFieldProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [pendingMode, setPendingMode] = useState<typeof PriceMode[keyof typeof PriceMode] | null>(null)

  const { price_mode, package_v2_id, total_price, custom_price, job_name, area_sqm, frequency, validationErrors } = state

  // Confirm before switching to custom if package already selected
  function handleModeChange(newMode: string) {
    const mode = newMode as typeof PriceMode[keyof typeof PriceMode]
    if (mode === PriceMode.Custom && package_v2_id) {
      setPendingMode(mode)
      setShowConfirm(true)
    } else {
      dispatch({ type: 'SET_PRICE_MODE', mode })
    }
  }

  function confirmModeSwitch() {
    if (pendingMode) {
      dispatch({ type: 'SET_PRICE_MODE', mode: pendingMode })
    }
    setShowConfirm(false)
    setPendingMode(null)
  }

  const selectedPkg = packages.find((p) => p.id === package_v2_id)

  return (
    <div className="space-y-4">
      {/* Mode selector */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">ประเภทการคิดราคา</Label>
        <RadioGroup value={price_mode} onValueChange={handleModeChange} className="flex gap-4">
          <div className="flex items-center gap-2">
            <RadioGroupItem value={PriceMode.Package} id="mode-package" />
            <Label htmlFor="mode-package" className="cursor-pointer text-sm">Package</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value={PriceMode.Override} id="mode-override" />
            <Label htmlFor="mode-override" className="cursor-pointer text-sm">ปรับราคา</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value={PriceMode.Custom} id="mode-custom" />
            <Label htmlFor="mode-custom" className="cursor-pointer text-sm">Custom Job</Label>
          </div>
        </RadioGroup>
      </div>

      {/* Package selector (Package + Override modes) */}
      {price_mode !== PriceMode.Custom && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Service Package</Label>
          {packagesLoading ? (
            <div className="h-10 bg-muted rounded-md animate-pulse" />
          ) : packages.length === 0 ? (
            <div className="p-3 border rounded-md text-sm text-muted-foreground text-center">
              ยังไม่มี Service Package กรุณาเพิ่มใน Settings ก่อน
            </div>
          ) : (
            <Select
              value={package_v2_id ?? ''}
              onValueChange={(id) => {
                const pkg = packages.find((p) => p.id === id) ?? null
                dispatch({ type: 'SELECT_PACKAGE', package: pkg })
              }}
            >
              <SelectTrigger className={cn(validationErrors.package_v2_id && 'border-destructive')}>
                <SelectValue placeholder="เลือก Package" />
              </SelectTrigger>
              <SelectContent>
                {packages.map((pkg) => (
                  <SelectItem key={pkg.id} value={pkg.id}>
                    <span className="font-medium">{pkg.name}</span>
                    {pkg.base_price != null && (
                      <span className="ml-2 text-muted-foreground">
                        {formatCurrency(pkg.base_price)}
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {validationErrors.package_v2_id && (
            <p className="text-xs text-destructive">{validationErrors.package_v2_id}</p>
          )}
        </div>
      )}

      {/* Custom Job name */}
      {price_mode === PriceMode.Custom && (
        <div className="space-y-1">
          <Label htmlFor="job_name" className="text-xs text-muted-foreground">
            ชื่องาน <span className="text-destructive">*</span>
          </Label>
          <Input
            id="job_name"
            placeholder="เช่น ทำความสะอาดโรงงาน"
            value={job_name}
            onChange={(e) => dispatch({ type: 'SET_JOB_NAME', name: e.target.value })}
            className={cn(validationErrors.job_name && 'border-destructive')}
          />
          {validationErrors.job_name && (
            <p className="text-xs text-destructive">{validationErrors.job_name}</p>
          )}
        </div>
      )}

      {/* Area & Frequency — frequency hidden for Custom mode (spec T4.0 / Sally UX) */}
      <div className={price_mode === PriceMode.Custom ? 'space-y-1' : 'grid grid-cols-2 gap-3'}>
        <div className="space-y-1">
          <Label htmlFor="area_sqm" className="text-xs text-muted-foreground">
            พื้นที่ (ตร.ม.)
          </Label>
          <Input
            id="area_sqm"
            type="number"
            min={1}
            placeholder="เช่น 120"
            value={area_sqm ?? ''}
            onChange={(e) => {
              const val = e.target.value ? Number(e.target.value) : null
              dispatch({ type: 'SET_AREA_SQM', area: val })
            }}
          />
        </div>
        {price_mode !== PriceMode.Custom && (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">ความถี่ต่อเดือน</Label>
            <Select
              value={frequency?.toString() ?? 'none'}
              onValueChange={(val) => {
                const freq = val === 'none' ? null : (Number(val) as 1 | 2 | 4 | 8)
                dispatch({ type: 'SET_FREQUENCY', frequency: freq })
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="ไม่ระบุ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">ไม่ระบุ</SelectItem>
                <SelectItem value="1">1 ครั้ง</SelectItem>
                <SelectItem value="2">2 ครั้ง</SelectItem>
                <SelectItem value="4">4 ครั้ง</SelectItem>
                <SelectItem value="8">8 ครั้ง</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Override price input */}
      {price_mode === PriceMode.Override && (
        <div className="space-y-1">
          <Label htmlFor="custom_price" className="text-xs text-muted-foreground">
            ราคาที่ต้องการ (฿) <span className="text-destructive">*</span>
          </Label>
          <Input
            id="custom_price"
            type="number"
            min={0}
            placeholder="ระบุราคา"
            value={custom_price ?? ''}
            onChange={(e) => {
              const val = e.target.value === '' ? null : Number(e.target.value)
              dispatch({ type: 'SET_CUSTOM_PRICE', price: val })
            }}
            className={cn(validationErrors.custom_price && 'border-destructive')}
          />
          {selectedPkg?.base_price != null && (
            <p className="text-xs text-muted-foreground">
              ราคา package เดิม: {formatCurrency(selectedPkg.base_price)}
            </p>
          )}
          {validationErrors.custom_price && (
            <p className="text-xs text-destructive">{validationErrors.custom_price}</p>
          )}
        </div>
      )}

      {/* Custom mode price */}
      {price_mode === PriceMode.Custom && (
        <div className="space-y-1">
          <Label htmlFor="custom_price_job" className="text-xs text-muted-foreground">
            ราคา (฿) <span className="text-destructive">*</span>
          </Label>
          <Input
            id="custom_price_job"
            type="number"
            min={0}
            placeholder="ระบุราคา (0 = ฟรี)"
            value={custom_price ?? ''}
            onChange={(e) => {
              const val = e.target.value === '' ? null : Number(e.target.value)
              dispatch({ type: 'SET_CUSTOM_PRICE', price: val })
            }}
            className={cn(validationErrors.custom_price && 'border-destructive')}
          />
          {validationErrors.custom_price && (
            <p className="text-xs text-destructive">{validationErrors.custom_price}</p>
          )}
        </div>
      )}

      {/* Total price display */}
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
        <span className="text-sm text-muted-foreground">ราคารวม</span>
        <div className="flex items-center gap-2">
          {price_mode === PriceMode.Override && custom_price !== null && (
            <Badge variant="secondary" className="text-xs">ปรับราคา</Badge>
          )}
          {price_mode === PriceMode.Custom && (
            <Badge variant="secondary" className="text-xs">Custom</Badge>
          )}
          <span className="text-lg font-bold text-tinedy-blue">
            {formatCurrency(price_mode === PriceMode.Package ? total_price : custom_price ?? 0)}
          </span>
        </div>
      </div>

      {/* Confirm dialog for Package→Custom switch */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>เปลี่ยนเป็น Custom Job?</AlertDialogTitle>
            <AlertDialogDescription>
              เปลี่ยนจะล้างข้อมูล Package ที่เลือกไว้ — ยืนยัน?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingMode(null)}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={confirmModeSwitch}>ยืนยัน</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// Skeleton for loading state
export function SmartPriceFieldSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-4 bg-muted rounded w-32 animate-pulse" />
      <div className="flex gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-5 bg-muted rounded w-20 animate-pulse" />
        ))}
      </div>
      <div className="h-10 bg-muted rounded animate-pulse" />
      <div className="h-10 bg-muted rounded animate-pulse" />
    </div>
  )
}
