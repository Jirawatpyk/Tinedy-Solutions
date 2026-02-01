import { useState, useEffect } from 'react'

interface UseChartAnimationOptions {
  /** ระยะเวลาที่รอก่อนเริ่ม animation (ms) */
  initialDelay?: number
  /** ระยะเวลาของ animation (ms) */
  animationDuration?: number
  /** เปิด/ปิด animation */
  enabled?: boolean
}

interface ChartAnimationState {
  /** Chart พร้อมแสดง animation หรือยัง */
  isReady: boolean
  /** แสดง labels หรือยัง */
  showLabels: boolean
}

/**
 * Custom hook สำหรับจัดการ animation ของ charts
 *
 * ใช้งาน:
 * - ซ่อน chart ตอนเริ่มต้น
 * - แสดง chart พร้อม animation หลังจาก initialDelay
 * - แสดง labels หลังจาก animation เสร็จสิ้น
 * - Reset animation เมื่อ data เปลี่ยน
 *
 * @param data - ข้อมูลที่ใช้ใน chart (สำหรับ dependency tracking)
 * @param options - ตัวเลือกการ config animation
 * @returns Object ที่มี isReady และ showLabels states
 *
 * @example
 * const chart = useChartAnimation(chartData, {
 *   initialDelay: 50,
 *   animationDuration: 800,
 *   enabled: true
 * })
 *
 * <Pie
 *   opacity={chart.isReady ? 1 : 0}
 *   labelLine={chart.showLabels}
 *   animationDuration={chart.isReady ? 800 : 0}
 * />
 */
export function useChartAnimation(
  data: unknown,
  options: UseChartAnimationOptions = {}
): ChartAnimationState {
  const {
    initialDelay = 50,
    animationDuration = 800,
    enabled = true,
  } = options

  const [isReady, setIsReady] = useState(false)
  const [showLabels, setShowLabels] = useState(false)

  // Initial mount animation
  useEffect(() => {
    if (!enabled) {
      setIsReady(true)
      setShowLabels(true)
      return
    }

    const readyTimer = setTimeout(() => {
      setIsReady(true)
    }, initialDelay)

    const labelsTimer = setTimeout(() => {
      setShowLabels(true)
    }, initialDelay + animationDuration + 50) // animation + 50ms buffer

    return () => {
      clearTimeout(readyTimer)
      clearTimeout(labelsTimer)
    }
  }, [enabled, initialDelay, animationDuration])

  // Reset animation when data changes
  useEffect(() => {
    if (!enabled) return

    setShowLabels(false)
    const timer = setTimeout(() => {
      setShowLabels(true)
    }, animationDuration + 50) // animation + 50ms buffer

    return () => clearTimeout(timer)
  }, [data, enabled, animationDuration])

  return { isReady, showLabels }
}
