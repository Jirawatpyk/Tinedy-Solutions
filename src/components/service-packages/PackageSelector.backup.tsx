/**
 * PackageSelector Component - Service Package Selection for Booking Form
 *
 * Component สำหรับเลือกแพ็คเก็จบริการในฟอร์มจองงาน
 * รองรับทั้ง V1 (Fixed) และ V2 (Tiered Pricing)
 *
 * Features:
 * - แสดงรายการแพ็คเก็จแบบ grouped by type
 * - สำหรับ Tiered: รับ input พื้นที่และความถี่
 * - คำนวณราคาอัตโนมัติ
 * - แสดงข้อมูลพนักงานที่ต้องการ
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getActivePackagesV2,
  calculatePricing,
  formatPrice,
  formatArea,
  formatStaffCount,
} from '@/lib/pricing-utils'
import { getFrequencyLabel } from '@/types/service-package-v2'
import type {
  ServicePackageV2,
  ServicePackageV2WithTiers,
  BookingFrequency,
  PricingCalculationResult,
} from '@/types'
import { PricingModel } from '@/types'

export interface PackageSelectionData {
  /** Selected package ID (V2) */
  packageId: string
  /** Package pricing model */
  pricingModel: 'fixed' | 'tiered'
  /** For tiered pricing: area in sqm */
  areaSqm?: number
  /** For tiered pricing: frequency (1, 2, 4, 8) */
  frequency?: BookingFrequency
  /** Calculated or base price */
  price: number
  /** Required staff count */
  requiredStaff: number
  /** Package name (for display) */
  packageName: string
  /** Estimated duration in hours */
  estimatedHours?: number
}

interface PackageSelectorProps {
  /** Service type filter */
  serviceType?: 'cleaning' | 'training'
  /** Selected package data */
  value?: PackageSelectionData | null
  /** Change handler */
  onChange?: (data: PackageSelectionData | null) => void
  /** Disabled state */
  disabled?: boolean
  /** Show validation errors */
  showErrors?: boolean
  /** External packages (optional - if not provided, will fetch internally) */
  packages?: ServicePackageV2WithTiers[]
}

/**
 * PricingResultDisplay - Component ย่อยสำหรับแสดงผลคำนวณราคา
 * ใช้ memo เพื่อป้องกัน re-render ที่ไม่จำเป็น
 */
interface PricingResultDisplayProps {
  pricingResult: PricingCalculationResult | null
  areaSqm: number
  frequency: BookingFrequency
}

/**
 * Skeleton Loading component สำหรับแสดงระหว่างรอคำนวณราคา
 * ออกแบบให้เข้ากับ PricingResultDisplay layout ใหม่
 */
const PricingResultSkeleton = () => {
  return (
    <div className="space-y-3 animate-pulse">
      {/* Price skeleton - Hero Element */}
      <div className="bg-gradient-to-r from-gray-100 to-gray-50 rounded-lg p-4">
        <div className="text-center space-y-2">
          <div className="h-4 w-16 bg-gray-200 rounded mx-auto"></div>
          <div className="h-10 w-40 bg-gray-200 rounded mx-auto"></div>
        </div>
      </div>

      {/* Details skeleton - 3 columns */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
          <div className="h-3 w-12 bg-gray-200 rounded mx-auto"></div>
          <div className="h-4 w-16 bg-gray-200 rounded mx-auto"></div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
          <div className="h-3 w-12 bg-gray-200 rounded mx-auto"></div>
          <div className="h-4 w-16 bg-gray-200 rounded mx-auto"></div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
          <div className="h-3 w-16 bg-gray-200 rounded mx-auto"></div>
          <div className="h-4 w-12 bg-gray-200 rounded mx-auto"></div>
        </div>
      </div>
    </div>
  )
}

PricingResultSkeleton.displayName = 'PricingResultSkeleton'

const PricingResultDisplay = ({ pricingResult, areaSqm, frequency }: PricingResultDisplayProps) => {
  if (!pricingResult || !pricingResult.found) return null

  return (
    <div className="border-t pt-3 mt-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">ราคารวม:</span>
        <span className="text-2xl font-bold text-tinedy-blue">{formatPrice(pricingResult.price)}</span>
      </div>
      <div className="flex items-center justify-between text-sm mt-2">
        <span className="text-muted-foreground">พื้นที่:</span>
        <span className="font-medium">{formatArea(areaSqm)}</span>
      </div>
      <div className="flex items-center justify-between text-sm mt-1">
        <span className="text-muted-foreground">ความถี่:</span>
        <span className="font-medium">{getFrequencyLabel(frequency)}</span>
      </div>
      <div className="flex items-center justify-between text-sm mt-1">
        <span className="text-muted-foreground">พนักงานที่ต้องการ:</span>
        <span className="font-medium">{formatStaffCount(pricingResult.required_staff)} คน</span>
      </div>
    </div>
  )
}

PricingResultDisplay.displayName = 'PricingResultDisplay'

/**
 * PackageSelector Component
 */
export function PackageSelector({
  serviceType = 'cleaning',
  value,
  onChange,
  disabled = false,
  showErrors = false,
  packages: externalPackages,
}: PackageSelectorProps) {
  const [packages, setPackages] = useState<ServicePackageV2[]>([])
  const [loading, setLoading] = useState(!externalPackages) // ถ้ามี external packages แล้วไม่ต้อง loading
  const [selectedPackage, setSelectedPackage] = useState<ServicePackageV2 | null>(null)

  // Tiered pricing inputs
  const [areaSqm, setAreaSqm] = useState<number>(0)
  const [frequency, setFrequency] = useState<BookingFrequency>(1)

  // Debounced area value สำหรับการคำนวณ (รอ 500ms หลังจากหยุดพิมพ์)
  const [debouncedAreaSqm, setDebouncedAreaSqm] = useState<number>(0)

  // Price calculation result
  const [pricingResult, setPricingResult] = useState<PricingCalculationResult | null>(null)
  const [calculating, setCalculating] = useState(false)

  // Flag เพื่อป้องกันการ emit ซ้ำเมื่อ restore value
  const [isRestoring, setIsRestoring] = useState(false)

  // Ref เพื่อป้องกัน infinite loop ในการ calculate
  const isCalculatingRef = useRef(false)
  // Ref เก็บ calculation signature ล่าสุด (ป้องกัน double calculation)
  const lastCalculationSignatureRef = useRef<string>('')

  // Ref เก็บ pricingResult ล่าสุด เพื่อเปรียบเทียบก่อน setState (ป้องกัน re-render ซ้ำ)
  const lastPricingResultRef = useRef<PricingCalculationResult | null>(null)

  // Ref เก็บ value ล่าสุดที่ได้ restore แล้ว เพื่อป้องกัน re-restore ซ้ำ
  const lastRestoredValueRef = useRef<string | null>(null)

  // Ref เก็บ selection ล่าสุดที่ emit ไปแล้ว เพื่อป้องกัน emit ซ้ำ
  const lastEmittedSelectionRef = useRef<string | null>(null)

  // Ref เก็บ onChange callback เพื่อป้องกัน emitSelection re-create
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  // Ref เก็บ selectedPackage เพื่อใช้ใน useEffect โดยไม่ต้องเป็น dependency
  const selectedPackageRef = useRef(selectedPackage)
  const areaSqmRef = useRef(areaSqm)
  const frequencyRef = useRef(frequency)

  useEffect(() => {
    selectedPackageRef.current = selectedPackage
    areaSqmRef.current = areaSqm
    frequencyRef.current = frequency
  }, [selectedPackage, areaSqm, frequency])

  /**
   * Load active packages (only if not provided externally)
   */
  const loadPackages = useCallback(async () => {
    // ถ้ามี external packages ให้ใช้ของนั้นแทน
    if (externalPackages) {
      setPackages(externalPackages as ServicePackageV2[])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const data = await getActivePackagesV2(serviceType)
      setPackages(data)
    } catch (error) {
      console.error('Error loading packages:', error)
    } finally {
      setLoading(false)
    }
  }, [serviceType, externalPackages])


  /**
   * Emit selection to parent (with deduplication)
   */
  const emitSelection = useCallback((data: PackageSelectionData) => {
    const signature = JSON.stringify({
      packageId: data.packageId,
      pricingModel: data.pricingModel,
      areaSqm: data.areaSqm,
      frequency: data.frequency,
      price: data.price,
    })

    // ถ้าเหมือนเดิม ไม่ต้อง emit ซ้ำ
    if (lastEmittedSelectionRef.current === signature) {
      console.log('🔄 Skipping duplicate emit:', signature)
      return
    }

    console.log('✅ Emitting selection:', signature)
    lastEmittedSelectionRef.current = signature
    onChangeRef.current?.(data)
  }, []) // ไม่มี dependency เพราะใช้ ref แทน

  /**
   * Debounce areaSqm input (รอ 500ms หลังจากหยุดพิมพ์)
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedAreaSqm(areaSqm)
    }, 500)

    return () => clearTimeout(timer)
  }, [areaSqm])

  /**
   * Load packages on mount
   */
  useEffect(() => {
    loadPackages()
  }, [serviceType, loadPackages])

  /**
   * Restore state from value prop (when modal reopens)
   */
  useEffect(() => {
    if (value && packages.length > 0) {
      // สร้าง signature ของ value เพื่อเช็คว่าเปลี่ยนจริงหรือไม่
      const valueSignature = JSON.stringify({
        packageId: value.packageId,
        pricingModel: value.pricingModel,
        areaSqm: value.areaSqm,
        frequency: value.frequency,
      })

      // ถ้า value เหมือนเดิม ไม่ต้อง restore ซ้ำ
      if (lastRestoredValueRef.current === valueSignature) {
        return
      }

      setIsRestoring(true) // เริ่ม restore
      lastRestoredValueRef.current = valueSignature

      // Reset calculation signature เพื่อให้คำนวณใหม่หลัง restore
      lastCalculationSignatureRef.current = ''

      // Find the package by ID
      const pkg = packages.find(p => p.id === value.packageId)
      if (pkg) {
        setSelectedPackage(pkg)

        // Restore tiered pricing inputs if applicable
        if (value.pricingModel === 'tiered' && value.areaSqm && value.frequency) {
          setAreaSqm(value.areaSqm)
          setDebouncedAreaSqm(value.areaSqm) // Restore debounced value ทันทีเมื่อ restore
          setFrequency(value.frequency)
        }
      }

      // หน่วง flag เพื่อให้ state update เสร็จก่อน
      setTimeout(() => setIsRestoring(false), 100)
    } else if (!value && !selectedPackage) {
      // Clear selection ONLY when value is null AND no package currently selected
      // ป้องกันการ clear เมื่อ value เป็น null ชั่วคราวจาก re-render
      lastRestoredValueRef.current = null
      setSelectedPackage(null)
      setAreaSqm(0)
      setDebouncedAreaSqm(0) // Clear debounced value ด้วย
      setFrequency(1)
      setPricingResult(null)
      setIsRestoring(false)
    }
  }, [value, packages, selectedPackage])

  /**
   * Calculate price when inputs change (for tiered pricing)
   * ใช้ debouncedAreaSqm แทน areaSqm เพื่อป้องกันคำนวณทุกครั้งที่พิมพ์
   */
  useEffect(() => {
    // ข้ามถ้ากำลัง restore หรือยัง loading packages
    if (isRestoring || loading) {
      console.log('⏭️ Skipping calculation: isRestoring or loading')
      return
    }
    if (!selectedPackage || selectedPackage.pricing_model !== PricingModel.Tiered) return
    if (debouncedAreaSqm <= 0) {
      setPricingResult(null)
      return
    }

    // สร้าง signature สำหรับการคำนวณนี้
    const calculationSignature = JSON.stringify({
      packageId: selectedPackage.id,
      area: debouncedAreaSqm,
      frequency,
    })

    // ถ้า signature เดียวกับครั้งก่อน = ไม่ต้องคำนวณซ้ำ
    if (lastCalculationSignatureRef.current === calculationSignature) {
      console.log('⏭️ Skipping duplicate calculation:', calculationSignature)
      return
    }

    // ป้องกัน double calculation - ถ้ากำลังคำนวณอยู่ ข้ามเลย
    if (isCalculatingRef.current) {
      console.log('⏭️ Skipping: already calculating')
      return
    }

    console.log('🧮 Starting price calculation:', calculationSignature)

    // บันทึก signature ก่อนเริ่มคำนวณ
    lastCalculationSignatureRef.current = calculationSignature

    // Flag สำหรับ cleanup (ป้องกัน state update หลัง unmount)
    let isCancelled = false

    isCalculatingRef.current = true
    setCalculating(true)

    // คำนวณราคาโดยตรง
    calculatePricing(selectedPackage.id, debouncedAreaSqm, frequency)
      .then((result) => {
        if (!isCancelled) {
          console.log('✅ Calculation complete:', result)

          // เปรียบเทียบกับผลลัพธ์ก่อนหน้า - ถ้าเหมือนกันไม่ต้อง setState
          const isSameResult =
            lastPricingResultRef.current?.price === result?.price &&
            lastPricingResultRef.current?.found === result?.found &&
            lastPricingResultRef.current?.required_staff === result?.required_staff

          if (!isSameResult) {
            console.log('📊 Setting new pricing result')
            lastPricingResultRef.current = result
            setPricingResult(result)
          } else {
            console.log('⏭️ Skipping setPricingResult: same result')
          }
        }
      })
      .catch((error) => {
        if (!isCancelled) {
          console.error('❌ Error calculating price:', error)
          lastPricingResultRef.current = null
          setPricingResult(null)
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setCalculating(false)
        }
        isCalculatingRef.current = false
      })

    // Cleanup function: cancel calculation เมื่อ component unmount หรือ dependencies เปลี่ยน
    return () => {
      if (!isCancelled) {
        console.log('🧹 Cleaning up calculation')
      }
      isCancelled = true
      isCalculatingRef.current = false
    }
  }, [selectedPackage, debouncedAreaSqm, frequency, isRestoring, loading])

  /**
   * Emit Fixed pricing selection when package is selected
   */
  useEffect(() => {
    // Guard clauses
    if (isRestoring || calculating || loading) return
    if (!selectedPackage) return
    if (selectedPackage.pricing_model !== PricingModel.Fixed) return

    emitSelection({
      packageId: selectedPackage.id,
      pricingModel: 'fixed',
      price: selectedPackage.base_price || 0,
      requiredStaff: 1,
      packageName: selectedPackage.name,
      estimatedHours: selectedPackage.duration_minutes ? selectedPackage.duration_minutes / 60 : undefined,
    })
  }, [selectedPackage, isRestoring, calculating, loading, emitSelection])

  /**
   * Emit Tiered pricing selection when calculation is complete
   */
  useEffect(() => {
    // Guard clauses
    if (isRestoring || calculating || loading) {
      console.log('⏭️ Skipping tiered emit: isRestoring/calculating/loading')
      return
    }

    const pkg = selectedPackageRef.current
    if (!pkg || pkg.pricing_model !== PricingModel.Tiered) return
    if (!pricingResult || !pricingResult.found) return

    console.log('📤 Preparing to emit tiered selection')

    emitSelection({
      packageId: pkg.id,
      pricingModel: 'tiered',
      areaSqm: areaSqmRef.current,
      frequency: frequencyRef.current,
      price: pricingResult.price,
      requiredStaff: pricingResult.required_staff,
      packageName: pkg.name,
      estimatedHours: pricingResult.tier?.estimated_hours ?? undefined,
    })
  }, [pricingResult, isRestoring, calculating, loading, emitSelection]) // ใช้ ref แทน direct state

  /**
   * Handle package selection
   */
  const handlePackageChange = (packageId: string) => {
    const pkg = packages.find((p) => p.id === packageId) || null
    setSelectedPackage(pkg)
    setPricingResult(null)

    // Reset tiered inputs
    if (pkg && pkg.pricing_model === PricingModel.Tiered) {
      setAreaSqm(0)
      setDebouncedAreaSqm(0) // Clear debounced value ด้วย
      setFrequency(1)
    }
  }

  /**
   * Group packages by pricing model
   */
  const fixedPackages = packages.filter((p) => p.pricing_model === PricingModel.Fixed)
  const tieredPackages = packages.filter((p) => p.pricing_model === PricingModel.Tiered)

  /**
   * Check if form is complete
   */
  const isComplete = () => {
    if (!selectedPackage) return false

    if (selectedPackage.pricing_model === PricingModel.Fixed) {
      return true
    } else {
      return areaSqm > 0 && pricingResult?.found
    }
  }

  return (
    <div className="space-y-4">
      {/* Package Selection */}
      <div>
        <Label htmlFor="package">เลือกแพ็คเก็จบริการ *</Label>
        <Select
          value={selectedPackage?.id || ''}
          onValueChange={handlePackageChange}
          disabled={disabled || loading}
        >
          <SelectTrigger id="package">
            <SelectValue placeholder={loading ? 'กำลังโหลด...' : 'เลือกแพ็คเก็จ'} />
          </SelectTrigger>
          <SelectContent>
            {/* Fixed Pricing Packages */}
            {fixedPackages.length > 0 && (
              <SelectGroup>
                <SelectLabel>แพ็คเก็จราคาคงที่</SelectLabel>
                {fixedPackages.map((pkg) => (
                  <SelectItem key={pkg.id} value={pkg.id}>
                    <div className="flex items-center gap-2">
                      <span>{pkg.name}</span>
                      {pkg.base_price && (
                        <span className="text-muted-foreground text-sm">
                          ({formatPrice(pkg.base_price)})
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectGroup>
            )}

            {/* Tiered Pricing Packages */}
            {tieredPackages.length > 0 && (
              <SelectGroup>
                <SelectLabel>แพ็คเก็จราคาตามพื้นที่</SelectLabel>
                {tieredPackages.map((pkg) => (
                  <SelectItem key={pkg.id} value={pkg.id}>
                    <div className="flex items-center gap-2">
                      <span>{pkg.name}</span>
                      {pkg.category && (
                        <Badge variant="outline" className="text-xs">
                          {pkg.category}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectGroup>
            )}

            {packages.length === 0 && !loading && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                ไม่พบแพ็คเก็จที่ใช้งานได้
              </div>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Tiered Pricing Inputs */}
      {selectedPackage && selectedPackage.pricing_model === PricingModel.Tiered && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-blue-900 mb-3">
              <MapPin className="h-4 w-4" />
              กำหนดพื้นที่และความถี่
            </div>

            {/* Area Input */}
            <div>
              <Label htmlFor="area">พื้นที่ (ตารางเมตร) *</Label>
              <Input
                id="area"
                type="number"
                min="1"
                value={areaSqm || ''}
                onChange={(e) => setAreaSqm(parseInt(e.target.value) || 0)}
                placeholder="เช่น 150"
                disabled={disabled}
                className={cn(
                  showErrors && areaSqm <= 0 && 'border-red-500'
                )}
              />
              {showErrors && areaSqm <= 0 && (
                <p className="text-sm text-red-600 mt-1">กรุณากรอกพื้นที่</p>
              )}
            </div>

            {/* Frequency Selector */}
            <div>
              <Label htmlFor="frequency">ความถี่การบริการ *</Label>
              <Select
                value={frequency.toString()}
                onValueChange={(value) => setFrequency(parseInt(value) as BookingFrequency)}
                disabled={disabled}
              >
                <SelectTrigger id="frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">{getFrequencyLabel(1)}</SelectItem>
                  <SelectItem value="2">{getFrequencyLabel(2)}</SelectItem>
                  <SelectItem value="4">{getFrequencyLabel(4)}</SelectItem>
                  <SelectItem value="8">{getFrequencyLabel(8)}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pricing Result */}
      {selectedPackage && (
        <Card
          className={cn(
            'border-2',
            isComplete() ? 'border-green-500 bg-green-50' : 'border-gray-300'
          )}
        >
          <CardContent className="pt-6">
            {/* Fixed Pricing Display */}
            {selectedPackage.pricing_model === PricingModel.Fixed && selectedPackage.base_price && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">ราคาแพ็คเก็จ</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">ราคารวม:</span>
                  <span className="text-2xl font-bold text-tinedy-blue">
                    {formatPrice(selectedPackage.base_price)}
                  </span>
                </div>
                {selectedPackage.duration_minutes && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">ระยะเวลา:</span>
                    <span className="font-medium">{selectedPackage.duration_minutes} นาที</span>
                  </div>
                )}
              </div>
            )}

            {/* Tiered Pricing Display */}
            {selectedPackage.pricing_model === PricingModel.Tiered && (
              <div className="space-y-3">
                {/* แสดง Skeleton Loading เมื่อกำลัง debounce หรือ calculating */}
                {areaSqm > 0 && (areaSqm !== debouncedAreaSqm || (calculating && !pricingResult)) && (
                  <PricingResultSkeleton />
                )}

                {!calculating && areaSqm === debouncedAreaSqm && areaSqm <= 0 && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <AlertCircle className="h-5 w-5" />
                    <span className="text-sm">กรุณากรอกพื้นที่เพื่อคำนวณราคา</span>
                  </div>
                )}

                {!calculating && areaSqm === debouncedAreaSqm && areaSqm > 0 && pricingResult && !pricingResult.found && (
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="h-5 w-5" />
                    <span className="text-sm">
                      ไม่พบระดับราคาสำหรับพื้นที่ {formatArea(areaSqm)}
                    </span>
                  </div>
                )}

                {/* แสดง PricingResultDisplay เสมอ แต่ให้ component เองตัดสินใจว่าจะแสดงอะไร */}
                <PricingResultDisplay
                  pricingResult={!calculating && areaSqm === debouncedAreaSqm ? pricingResult : null}
                  areaSqm={areaSqm}
                  frequency={frequency}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Validation Message */}
      {showErrors && !isComplete() && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          <span>กรุณาเลือกแพ็คเก็จและกรอกข้อมูลให้ครบถ้วน</span>
        </div>
      )}
    </div>
  )
}
